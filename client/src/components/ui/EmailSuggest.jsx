import { useMemo } from 'react';

/**
 * Inline GIKI-email autocompletion.
 *
 * If the user types something that looks like the local part of a GIKI roll
 * number (e.g. `u2023322`, `U2023322`, or even just digits like `2023322`),
 * we render a tappable chip below the field that auto-fills the full address:
 * `u2023322@giki.edu.pk`.
 *
 * Props
 * ─────
 *   value     current value of the email input
 *   onPick    called with the full suggested email when the chip is clicked
 *   id        optional id (used to make the chip's aria-controls match the input)
 */
export default function EmailSuggest({ value, onPick, id }) {
  const suggestion = useMemo(() => {
    const raw = (value || '').trim();
    if (!raw) return null;
    // Already past the local part — bail out.
    if (raw.includes('@')) return null;
    // Accept either `u2023322` or just `2023322` (we'll add the `u` for them).
    const local = raw.toLowerCase().replace(/^u?/, 'u');
    if (!/^u\d{4,10}$/.test(local)) return null;
    return `${local}@giki.edu.pk`;
  }, [value]);

  if (!suggestion) return null;

  return (
    <button
      type="button"
      className="email-suggest"
      onClick={() => onPick(suggestion)}
      aria-controls={id}
    >
      <span className="email-suggest-label">Use</span>
      <strong className="email-suggest-value">{suggestion}</strong>
      <span className="email-suggest-hint">tap to fill</span>
    </button>
  );
}
