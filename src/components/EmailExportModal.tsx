import React, { useState } from 'react';
import { Modal } from './Modal';
import { validateEmail } from '../utils/email';

interface Props {
  onClose: () => void;
  /** Resolves when the email was sent; rejects with a user-safe message otherwise. */
  onSend: (email: string) => Promise<void>;
}

export function EmailExportModal({ onClose, onSend }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    setError(null);
    setSending(true);
    try {
      await onSend(email.trim());
      onClose();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Failed to send the email. Please try again.');
      setSending(false);
    }
  };

  return (
    <Modal title="Email Transactions" onClose={() => { if (!sending) onClose(); }}>
      <form onSubmit={submit} className="form-grid" noValidate>
        <label className="full-width">
          Recipient email address
          <input
            type="email"
            autoFocus
            autoComplete="email"
            maxLength={254}
            value={email}
            placeholder="name@example.com"
            aria-invalid={error ? true : undefined}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          />
        </label>
        <p className="full-width email-note">
          The latest transactions (matching your current filters) are exported to Excel and attached to the email.
        </p>
        {error && <div className="form-error full-width" role="alert">{error}</div>}
        <div className="modal-actions full-width">
          <button type="button" className="btn btn-secondary" disabled={sending} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
        </div>
      </form>
    </Modal>
  );
}
