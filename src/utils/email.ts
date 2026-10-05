const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 254) return false;
  const at = email.lastIndexOf('@');
  if (at < 1 || at > 64) return false; // local part max 64 chars
  return EMAIL_PATTERN.test(email);
}

/** Returns a user-facing message, or null when the address is acceptable. */
export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email address is required.';
  if (!isValidEmail(value)) return 'Enter a valid email address, e.g. name@example.com.';
  return null;
}
