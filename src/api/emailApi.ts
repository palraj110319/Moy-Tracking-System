import type { MoyFilter } from '../types/domain';
import { searchTransactions } from '../local-backend/transactions';
import { buildTransactionsExcelAttachment } from '../local-backend/exports';
import { validateEmail } from '../utils/email';

// Empty = same origin (Vercel serves /api/* next to the site).
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');

// Vercel rejects request bodies above ~4.5 MB; stay safely under it.
const MAX_BASE64_LENGTH = 3_000_000;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Builds the Excel file from the latest stored transactions (all pages, current
 * filter) and asks the server to email it. Returns the number of rows attached.
 * Throws an Error whose message is safe to show to the user.
 */
export async function emailTransactionsExcel(to: string, filter: MoyFilter): Promise<number> {
  const invalid = validateEmail(to);
  if (invalid) throw new Error(invalid);

  // Read at click time so the attachment always reflects the latest data.
  const result = searchTransactions({ ...filter, page: 0, size: Number.MAX_SAFE_INTEGER });
  if (result.totalElements === 0) throw new Error('There are no transactions to email for the current filters.');

  const { filename, contentBase64 } = await buildTransactionsExcelAttachment(result.content);
  if (contentBase64.length > MAX_BASE64_LENGTH) {
    throw new Error('The Excel file is too large to email. Narrow the filters (e.g. a date range) and try again.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to.trim(), filename, contentBase64, rowCount: result.totalElements }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('The email service took too long to respond. Please try again.');
    }
    throw new Error('Could not reach the email service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let serverMessage: string | undefined;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string') serverMessage = body.error;
    } catch { /* non-JSON error body */ }
    if (response.status === 404) {
      throw new Error('Email service not found. Deploy to Vercel or run "vercel dev" locally so /api/send-email is available.');
    }
    throw new Error(serverMessage ?? `Failed to send the email (error ${response.status}).`);
  }
  return result.totalElements;
}
