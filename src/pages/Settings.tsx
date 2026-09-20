import React, { useEffect, useRef, useState } from 'react';
import { downloadBackup, eraseAllData, getRecordCount, restoreFromBackup } from '../api/dataApi';
import { MIN_PASSCODE_LENGTH } from '../api/authApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export function Settings() {
  const { notify } = useToast();
  const { passcodeEnabled, createPasscode, changePasscode, removePasscode } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [pendingRestore, setPendingRestore] = useState<File | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshCount = () => { getRecordCount().then(setCount).catch(() => setCount(null)); };
  useEffect(refreshCount, []);

  const handleBackup = () => {
    try {
      const n = downloadBackup();
      notify(`Backup downloaded (${n} transaction${n === 1 ? '' : 's'})`);
    } catch {
      notify('Backup failed', 'error');
    }
  };

  const handleRestore = async () => {
    if (!pendingRestore) return;
    try {
      const n = await restoreFromBackup(pendingRestore);
      notify(`Restored ${n} transaction${n === 1 ? '' : 's'}`);
      refreshCount();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Restore failed', 'error');
    } finally {
      setPendingRestore(null);
    }
  };

  const handleErase = () => {
    try {
      eraseAllData();
      notify('All data erased');
      refreshCount();
    } catch {
      notify('Could not erase data', 'error');
    } finally {
      setConfirmErase(false);
    }
  };

  const handleSetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length < MIN_PASSCODE_LENGTH) {
      notify(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters`, 'error');
      return;
    }
    try {
      if (passcodeEnabled) {
        const ok = await changePasscode(currentPasscode, newPasscode);
        if (!ok) { notify('Current passcode is incorrect', 'error'); return; }
        notify('Passcode changed');
      } else {
        await createPasscode(newPasscode);
        notify('Passcode set');
      }
      setCurrentPasscode('');
      setNewPasscode('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update the passcode', 'error');
    }
  };

  const handleRemovePasscode = async () => {
    try {
      const ok = await removePasscode(currentPasscode);
      if (!ok) { notify('Current passcode is incorrect', 'error'); return; }
      setCurrentPasscode('');
      notify('Passcode removed');
    } catch {
      notify('Could not remove the passcode', 'error');
    }
  };

  return (
    <div>
      <div className="page-header"><h2>Settings</h2></div>

      <div className="card">
        <h3>Your data</h3>
        <p>
          {count === null ? 'Counting records...' : <><strong>{count}</strong> active transaction{count === 1 ? '' : 's'}</>}{' '}
          stored in this browser.
        </p>
        <p className="muted">
          Nothing is sent to a server. Clearing your browser&rsquo;s site data, or switching browser or device,
          means the records won&rsquo;t be there. Download a backup regularly.
        </p>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleBackup}>Download backup (JSON)</button>
          <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>Restore from backup</button>
          <button className="btn btn-danger" onClick={() => setConfirmErase(true)}>Erase all data</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPendingRestore(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="card">
        <h3>Passcode lock</h3>
        <p className="muted">
          A convenience lock for a shared device. It is not strong security: the data itself is not encrypted.
        </p>
        <form className="passcode-form" onSubmit={handleSetPasscode}>
          {passcodeEnabled && (
            <label>
              Current passcode
              <input type="password" value={currentPasscode} onChange={(e) => setCurrentPasscode(e.target.value)} autoComplete="current-password" />
            </label>
          )}
          <label>
            {passcodeEnabled ? 'New passcode' : 'Passcode'}
            <input type="password" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} autoComplete="new-password" />
          </label>
          <div className="header-actions">
            <button className="btn btn-primary" type="submit">{passcodeEnabled ? 'Change passcode' : 'Set passcode'}</button>
            {passcodeEnabled && (
              <button className="btn btn-secondary" type="button" onClick={handleRemovePasscode}>Remove passcode</button>
            )}
          </div>
        </form>
      </div>

      {pendingRestore && (
        <ConfirmDialog
          title="Restore from backup?"
          message={`This replaces all current data with the contents of "${pendingRestore.name}". Download a backup first if you might need the current data.`}
          onConfirm={handleRestore}
          onCancel={() => setPendingRestore(null)}
        />
      )}
      {confirmErase && (
        <ConfirmDialog
          title="Erase all data?"
          message="Every transaction stored in this browser will be permanently removed. This cannot be undone."
          onConfirm={handleErase}
          onCancel={() => setConfirmErase(false)}
        />
      )}
    </div>
  );
}
