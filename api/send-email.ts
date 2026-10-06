/**
 * Vercel serverless function: emails the exported Moy transactions Excel file.
 *
 * SMTP credentials come ONLY from environment variables (never from the
 * request, never from source). See .env.example.
 *
 * Self-contained on purpose (no relative imports) so it deploys as-is.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FILENAME_PATTERN = /^[A-Za-z0-9._-]{1,80}\.xlsx$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// Best-effort abuse limiter (per warm instance). It slows casual abuse; it is not a hard guarantee.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function isValidEmail(value: string): boolean {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) return false;
  const at = value.lastIndexOf('@');
  return at >= 1 && at <= 64 && EMAIL_PATTERN.test(value);
}

/** Optional EMAIL_ALLOWED_RECIPIENTS: comma-separated addresses and/or @domains, e.g. "me@x.com,@mycompany.com". */
function recipientAllowed(to: string): boolean {
  const raw = process.env.EMAIL_ALLOWED_RECIPIENTS;
  if (!raw || !raw.trim()) return true;
  const lower = to.toLowerCase();
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => (rule.startsWith('@') ? lower.endsWith(rule) : lower === rule));
}

function fail(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ error });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Method not allowed.');
  }

  // Same-origin only: reject cross-site browser requests.
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return fail(res, 403, 'Request origin is not allowed.');
    } catch {
      return fail(res, 403, 'Request origin is not allowed.');
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return fail(res, 429, 'Too many email requests. Please wait a few minutes and try again.');

  // --- Validate input (server-side; never trust the client) ---
  const body: unknown = req.body;
  if (typeof body !== 'object' || body === null) return fail(res, 400, 'Invalid request.');
  const { to, filename, contentBase64, rowCount } = body as Record<string, unknown>;

  const recipient = typeof to === 'string' ? to.trim() : '';
  if (!recipient) return fail(res, 400, 'Email address is required.');
  if (!isValidEmail(recipient)) return fail(res, 400, 'Enter a valid email address.');
  if (!recipientAllowed(recipient)) return fail(res, 403, 'This email address is not allowed by the server configuration.');

  if (typeof contentBase64 !== 'string' || !contentBase64 || !BASE64_PATTERN.test(contentBase64)) {
    return fail(res, 400, 'The Excel attachment is missing or invalid.');
  }
  const attachment = Buffer.from(contentBase64, 'base64');
  if (attachment.length === 0 || attachment.length > MAX_ATTACHMENT_BYTES) {
    return fail(res, 413, 'The Excel attachment is empty or too large.');
  }
  // .xlsx files are ZIP containers: they must start with "PK\x03\x04".
  if (!(attachment[0] === 0x50 && attachment[1] === 0x4b && attachment[2] === 0x03 && attachment[3] === 0x04)) {
    return fail(res, 400, 'The attachment is not a valid Excel file.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const safeName = typeof filename === 'string' && FILENAME_PATTERN.test(filename) ? filename : `moy-transactions-${today}.xlsx`;
  const rows = typeof rowCount === 'number' && Number.isInteger(rowCount) && rowCount >= 0 ? rowCount : undefined;

  // --- SMTP configuration (environment only) ---
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  if (!host || !user || !pass || !from) {
    // Names only, never values — safe to show and makes misconfiguration easy to diagnose.
    const missing = [
      !host && 'SMTP_HOST',
      !user && 'SMTP_USER',
      !pass && 'SMTP_PASS',
      !from && 'EMAIL_FROM (or SMTP_USER)',
    ].filter(Boolean).join(', ');
    console.error(`send-email: missing environment variables: ${missing}`);
    return fail(res, 503, `Email is not configured on the server. Missing: ${missing}. Add them in Vercel (Settings → Environment Variables) and redeploy.`);
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    await transporter.sendMail({
      from,
      to: recipient,
      subject: `Moy transactions export – ${today}`,
      // Fixed, server-controlled content: callers cannot inject their own message body.
      text:
        `Hello,\n\nPlease find the Moy transactions export (${today}) attached` +
        `${rows !== undefined ? ` with ${rows} transaction(s)` : ''}.\n\nSent from Moy Tracker.`,
      attachments: [{ filename: safeName, content: attachment, contentType: XLSX_MIME }],
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Log details server-side only; never echo SMTP errors (they can reveal host/user) to the browser.
    console.error('send-email failed:', err instanceof Error ? `${err.name}: ${err.message}` : err);
    const code = (err as { code?: string } | null)?.code;
    if (code === 'EAUTH') return fail(res, 502, 'The email server rejected the login. Check the SMTP credentials on the server.');
    if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS') {
      return fail(res, 502, 'Could not connect to the email server. Please try again later.');
    }
    return fail(res, 502, 'Failed to send the email. Please try again later.');
  }
}
