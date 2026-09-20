import {
  disablePasscode, getAuthConfig, isSessionUnlocked, setPasscode, setSessionUnlocked, verifyPasscode,
  MIN_PASSCODE_LENGTH,
} from '../local-backend/auth';

export type AuthStatus = 'setup' | 'locked' | 'unlocked';

export { MIN_PASSCODE_LENGTH };

export function initialStatus(): AuthStatus {
  const config = getAuthConfig();
  if (!config) return 'setup';
  if (config.mode === 'none') return 'unlocked';
  return isSessionUnlocked() ? 'unlocked' : 'locked';
}

export function hasPasscode(): boolean {
  return getAuthConfig()?.mode === 'pin';
}

export async function createPasscode(passcode: string): Promise<void> {
  await setPasscode(passcode);
  setSessionUnlocked(true);
}

export function continueWithoutPasscode(): void {
  disablePasscode();
}

export async function unlock(passcode: string): Promise<boolean> {
  const ok = await verifyPasscode(passcode);
  if (ok) setSessionUnlocked(true);
  return ok;
}

export function lock(): void {
  setSessionUnlocked(false);
}

export async function changePasscode(current: string, next: string): Promise<boolean> {
  if (!(await verifyPasscode(current))) return false;
  await setPasscode(next);
  return true;
}

export async function removePasscode(current: string): Promise<boolean> {
  if (!(await verifyPasscode(current))) return false;
  disablePasscode();
  return true;
}
