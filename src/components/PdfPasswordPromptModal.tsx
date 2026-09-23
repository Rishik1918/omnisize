import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Eye, EyeOff, Loader2, X, ShieldAlert, Sparkles } from 'lucide-react';
import { PdfUnlocker } from '../services/pdfUnlocker';

interface PdfPasswordPromptModalProps {
  isOpen: boolean;
  file: File;
  onSuccess: (unlockedFile: File, matchedPassword: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export const PdfPasswordPromptModal: React.FC<PdfPasswordPromptModalProps> = ({
  isOpen,
  file,
  onSuccess,
  onCancel,
  title = 'Password Protected Document',
  description,
}) => {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAadhaarLike =
    file.name.toLowerCase().includes('aadhaar') ||
    file.name.toLowerCase().includes('eaadhaar') ||
    file.name.toLowerCase().includes('uidai');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter the password to open this document.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await PdfUnlocker.unlockWithPassword(file, password);
      if (res.success && res.unlockedBlob) {
        const unlockedFile = new File([res.unlockedBlob], file.name, {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
        onSuccess(unlockedFile, password);
      } else {
        setErrorMessage(
          isAadhaarLike
            ? 'Incorrect password. For Aadhaar, use FIRST 4 LETTERS of name in CAPITAL + 4-digit Birth Year (e.g. SREE2003).'
            : 'Incorrect password. Please verify and try again.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to unlock PDF. Please check the password.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
      }}
    >
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-5 relative">
        {/* Close / Cancel Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {description || (
                <>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {file.name}
                  </span>{' '}
                  is encrypted. Please enter the password to open, view, and edit it.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Aadhaar / Smart Hint Helper */}
        {isAadhaarLike && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <span className="font-semibold">Aadhaar Password Format:</span> First 4 letters of name in CAPITAL + 4-digit Birth Year (e.g.{' '}
              <span className="font-mono font-bold">RAME1985</span>).
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Document Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Unlock & Open</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
