import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { resolveExportPasswordPrompt } from '../utils/exportPasswordPrompt';
import { AppIcon } from './AppIcon';

const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 255;

interface PasswordStrength {
  label: string;
  score: 0 | 1 | 2 | 3 | 4;
  textClass: string;
  barClass: string;
}

function evaluatePasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) {
    return {
      label: '',
      score: 0,
      textClass: 'text-slate-400',
      barClass: 'bg-slate-200 dark:bg-slate-700'
    };
  }

  let points = 0;
  if (pwd.length >= 6) points += 1;
  if (pwd.length >= 10) points += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) points += 1;
  if (/\d/.test(pwd)) points += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) points += 1;

  if (pwd.length < MIN_PASSWORD_LENGTH || points <= 1) {
    return {
      label: 'Weak',
      score: 1,
      textClass: 'text-rose-600 dark:text-rose-400',
      barClass: 'bg-rose-500'
    };
  }
  if (points === 2) {
    return {
      label: 'Fair',
      score: 2,
      textClass: 'text-amber-600 dark:text-amber-400',
      barClass: 'bg-amber-500'
    };
  }
  if (points === 3) {
    return {
      label: 'Good',
      score: 3,
      textClass: 'text-indigo-600 dark:text-indigo-400',
      barClass: 'bg-indigo-500'
    };
  }
  return {
    label: 'Strong',
    score: 4,
    textClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500'
  };
}

export const ExportPasswordModal: React.FC = () => {
  const prompt = useSimulationStore((state) => state.exportPasswordPrompt);

  const [protectWithPassword, setProtectWithPassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  // Reset all ephemeral fields whenever the modal opens or closes
  useEffect(() => {
    if (prompt) {
      setProtectWithPassword(Boolean(prompt.initialProtect));
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setValidationError(null);
    } else {
      setPassword('');
      setConfirmPassword('');
      setValidationError(null);
    }
  }, [prompt]);

  // Focus the password field smoothly when the user opts into password protection
  useEffect(() => {
    if (prompt && protectWithPassword) {
      const timer = window.setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [prompt, protectWithPassword]);

  // Allow Esc key to cancel cleanly
  useEffect(() => {
    if (!prompt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolveExportPasswordPrompt({ confirmed: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt]);

  if (!prompt) return null;

  const isExcel = prompt.format === 'excel';
  const formatLabel = isExcel ? 'Excel Workbook (.xlsx)' : 'PDF Report (.pdf)';
  const strength = evaluatePasswordStrength(password);

  const isTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const hasMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordValid =
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    password === confirmPassword;

  const canSubmit = !protectWithPassword || isPasswordValid;

  const handleCancel = () => {
    setPassword('');
    setConfirmPassword('');
    resolveExportPasswordPrompt({ confirmed: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!protectWithPassword) {
      resolveExportPasswordPrompt({ confirmed: true, password: null });
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setValidationError(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match. Please confirm your password.');
      return;
    }

    const chosenPassword = password;
    setPassword('');
    setConfirmPassword('');
    resolveExportPasswordPrompt({ confirmed: true, password: chosenPassword });
  };

  const primaryActionLabel = protectWithPassword
    ? prompt.confirmLabel || (isExcel ? 'Encrypt & Export Excel' : 'Encrypt & Generate PDF')
    : isExcel
      ? 'Export Without Password'
      : 'Generate Without Password';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-password-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
      className="fixed inset-0 z-[75] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon size="sm" alt="Strata" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="export-password-modal-title"
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
                >
                  Document Password Protection
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    isExcel
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60'
                  }`}
                >
                  {isExcel ? (
                    <FileSpreadsheet className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span>{isExcel ? 'XLSX' : 'PDF'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {prompt.documentTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Cancel export"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Would you like to protect your exported <strong className="text-slate-900 dark:text-white">{formatLabel}</strong> with a password before downloading?
          </p>

          {/* Choice Cards: No Password vs Protect with Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Password protection option">
            <button
              type="button"
              role="radio"
              aria-checked={!protectWithPassword}
              onClick={() => {
                setProtectWithPassword(false);
                setValidationError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                !protectWithPassword
                  ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 ring-1 ring-slate-900/10 dark:ring-white/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    !protectWithPassword
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    !protectWithPassword
                      ? 'border-slate-900 dark:border-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {!protectWithPassword && (
                    <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                  )}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                No Password
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Standard export. Opens immediately without entering a password.
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={protectWithPassword}
              onClick={() => {
                setProtectWithPassword(true);
                setValidationError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                protectWithPassword
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    protectWithPassword
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    protectWithPassword
                      ? 'border-emerald-600 dark:border-emerald-400'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {protectWithPassword && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  )}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Protect with Password
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Encrypts the file so a password is required to open it.
              </div>
            </button>
          </div>

          {/* Password Entry & Confirmation Fields */}
          {protectWithPassword && (
            <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Enter Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="export-doc-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Enter Password
                  </label>
                  {password.length > 0 && (
                    <span className={`text-[11px] font-bold ${strength.textClass}`}>
                      {strength.label}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="export-doc-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 4-segment Password Strength Meter */}
                {password.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mt-0.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1 rounded-full transition-colors ${
                          strength.score >= seg
                            ? strength.barClass
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {isTooShort && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Enter at least {MIN_PASSWORD_LENGTH} characters.</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="export-doc-password-confirm"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    id="export-doc-password-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    placeholder="Re-enter password to confirm"
                    className={`w-full pl-3 pr-10 py-2 rounded-xl border bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition ${
                      hasMismatch
                        ? 'border-rose-400 dark:border-rose-500/70 focus:ring-rose-500/20 focus:border-rose-500'
                        : isPasswordValid
                          ? 'border-emerald-400 dark:border-emerald-500/70 focus:ring-emerald-500/20 focus:border-emerald-500'
                          : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500/25 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {hasMismatch && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Passwords do not match.</span>
                  </p>
                )}

                {isPasswordValid && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Passwords match — ready to encrypt.</span>
                  </p>
                )}
              </div>

              {validationError && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Your password is used only to encrypt this file and is never stored or recoverable. Keep a note of it so you can open the document later.
                </span>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                protectWithPassword
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
              }`}
            >
              {protectWithPassword ? <Lock className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
