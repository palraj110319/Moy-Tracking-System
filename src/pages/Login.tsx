import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MIN_PASSCODE_LENGTH } from '../api/authApi';

/** First run: choose a passcode (or skip). Afterwards: unlock screen. */
export function Login() {
  const { status, createPasscode, continueWithoutPasscode, unlock } = useAuth();
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'unlocked') return <Navigate to="/dashboard" replace />;

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passcode.length < MIN_PASSCODE_LENGTH) {
      setError(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`);
      return;
    }
    if (passcode !== confirm) {
      setError('Passcodes do not match.');
      return;
    }
    setBusy(true);
    try {
      await createPasscode(passcode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the passcode.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ok = await unlock(passcode);
      if (ok) navigate('/dashboard');
      else setError('Incorrect passcode.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'setup') {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleSetup}>
          <h2>Welcome to Moy Tracker</h2>
          <p className="muted">
            Your records are stored only in this browser. You can protect them with a passcode, which
            is a convenience lock and not a substitute for real security.
          </p>
          <label>
            New passcode
            <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus autoComplete="new-password" />
          </label>
          <label>
            Confirm passcode
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Set passcode'}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => { continueWithoutPasscode(); navigate('/dashboard'); }}
          >
            Continue without a passcode
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleUnlock}>
        <h2>Moy Tracker</h2>
        <label>
          Passcode
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus autoComplete="current-password" required />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
