/**
 * Optional passcode lock.
 *
 * IMPORTANT: this is a privacy convenience for a shared device, not security.
 * Everything lives in this browser, so someone with access to the browser's
 * developer tools can bypass it. Real access control needs a server.
 */
const AUTH_KEY = 'moy.auth.v1';
const SESSION_KEY = 'moy.session.unlocked';
const ITERATIONS = 150_000;
export const MIN_PASSCODE_LENGTH = 4;

export type AuthConfig =
  | { mode: 'none' }
  | { mode: 'pin'; salt: string; hash: string; iterations: number };

function toBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const s = atob(value);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function derive(passcode: string, salt: Uint8Array, iterations: number): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Passcodes need a secure (https) connection.');
  }
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passcode).buffer as ArrayBuffer, 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' }, key, 256
  );
  return toBase64(new Uint8Array(bits));
}

export function getAuthConfig(): AuthConfig | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthConfig;
    if (parsed.mode === 'none') return parsed;
    if (parsed.mode === 'pin' && parsed.salt && parsed.hash && parsed.iterations) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveConfig(config: AuthConfig): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(config));
}

export async function setPasscode(passcode: string): Promise<void> {
  if (passcode.length < MIN_PASSCODE_LENGTH) {
    throw new Error(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(passcode, salt, ITERATIONS);
  saveConfig({ mode: 'pin', salt: toBase64(salt), hash, iterations: ITERATIONS });
}

export function disablePasscode(): void {
  saveConfig({ mode: 'none' });
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const config = getAuthConfig();
  if (!config || config.mode !== 'pin') return false;
  const hash = await derive(passcode, fromBase64(config.salt), config.iterations);
  return hash === config.hash;
}

export function isSessionUnlocked(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

export function setSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* session storage unavailable: user just re-enters the passcode */ }
}
