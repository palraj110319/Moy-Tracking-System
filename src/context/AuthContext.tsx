import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';
import type { AuthStatus } from '../api/authApi';

interface AuthState {
  status: AuthStatus;
  isAuthenticated: boolean;
  passcodeEnabled: boolean;
  createPasscode: (passcode: string) => Promise<void>;
  continueWithoutPasscode: () => void;
  unlock: (passcode: string) => Promise<boolean>;
  lock: () => void;
  changePasscode: (current: string, next: string) => Promise<boolean>;
  removePasscode: (current: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => authApi.initialStatus());
  const [passcodeEnabled, setPasscodeEnabled] = useState<boolean>(() => authApi.hasPasscode());

  const createPasscode = useCallback(async (passcode: string) => {
    await authApi.createPasscode(passcode);
    setPasscodeEnabled(true);
    setStatus('unlocked');
  }, []);

  const continueWithoutPasscode = useCallback(() => {
    authApi.continueWithoutPasscode();
    setPasscodeEnabled(false);
    setStatus('unlocked');
  }, []);

  const unlock = useCallback(async (passcode: string) => {
    const ok = await authApi.unlock(passcode);
    if (ok) setStatus('unlocked');
    return ok;
  }, []);

  const lock = useCallback(() => {
    authApi.lock();
    setStatus('locked');
  }, []);

  const changePasscode = useCallback((current: string, next: string) => authApi.changePasscode(current, next), []);

  const removePasscode = useCallback(async (current: string) => {
    const ok = await authApi.removePasscode(current);
    if (ok) setPasscodeEnabled(false);
    return ok;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      isAuthenticated: status === 'unlocked',
      passcodeEnabled,
      createPasscode,
      continueWithoutPasscode,
      unlock,
      lock,
      changePasscode,
      removePasscode,
    }),
    [status, passcodeEnabled, createPasscode, continueWithoutPasscode, unlock, lock, changePasscode, removePasscode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
