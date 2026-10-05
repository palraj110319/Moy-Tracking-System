/** Trims, collapses inner whitespace and normalises Unicode (important for Tamil names). */
export function cleanPersonName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Case/whitespace-insensitive key used to detect duplicate person names. */
export function personKey(name: string): string {
  return cleanPersonName(name).toLocaleLowerCase();
}
