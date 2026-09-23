import React, { useState, useEffect } from 'react';
import { X, Unlock, CheckCircle2, Download, AlertCircle, Shield, CreditCard, FileKey, Sparkles } from 'lucide-react';
import { ProcessedItem } from '../types';
import { PdfUnlocker } from '../services/pdfUnlocker';
import { saveFile } from '../utils/fileSaver';

interface PdfUnlockerModalProps {
  item: ProcessedItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (unlockedBlob: Blob) => void;
}

export const PdfUnlockerModal: React.FC<PdfUnlockerModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [isAutoUnlocking, setIsAutoUnlocking] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Analyzing document & checking permissions...');
  const [unlockedBlob, setUnlockedBlob] = useState<Blob | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Manual presets: 'aadhaar' | 'pan' | 'universal'
  const [activePreset, setActivePreset] = useState<'aadhaar' | 'pan' | 'universal'>('aadhaar');

  // Aadhaar inputs
  const [aadhaarLetters, setAadhaarLetters] = useState('');
  const [aadhaarYear, setAadhaarYear] = useState('');

  // PAN inputs
  const [panDob, setPanDob] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Universal inputs
  const [universalPassword, setUniversalPassword] = useState('');

  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  // Auto-attempt unlock on open
  useEffect(() => {
    let active = true;
    setIsAutoUnlocking(true);
    setShowManualFallback(false);
    setManualError('');
    setStatusMessage('Checking permissions and testing smart formulas...');

    PdfUnlocker.autoUnlock(item.file, (msg) => {
      if (active) setStatusMessage(msg);
    })
      .then((res) => {
        if (!active) return;
        setIsAutoUnlocking(false);
        if (res.success && res.unlockedBlob) {
          setUnlockedBlob(res.unlockedBlob);
          onSuccess(res.unlockedBlob);
        } else {
          setShowManualFallback(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setIsAutoUnlocking(false);
        setShowManualFallback(true);
      });

    return () => {
      active = false;
    };
  }, [item]);

  // Derived Aadhaar 4-letter preview
  const cleanAadhaarPrefix = aadhaarLetters.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
  const cleanAadhaarYear = aadhaarYear.replace(/[^0-9]/g, '').slice(0, 4);
  const aadhaarPreview = cleanAadhaarPrefix + (cleanAadhaarYear || 'YYYY');

  // Derived PAN preview
  const cleanPanDigits = panDob.replace(/[^0-9]/g, '').slice(0, 8);
  const panPreview = cleanPanDigits || 'DDMMYYYY';

  const handleAadhaarSubmit = async () => {
    if (cleanAadhaarPrefix.length < 3) {
      setManualError('Enter at least 3-4 letters of the name.');
      return;
    }
    setManualError('');
    setManualLoading(true);

    try {
      const res = await PdfUnlocker.unlockAadhaar(item.file, cleanAadhaarPrefix, cleanAadhaarYear);
      if (res.success && res.unlockedBlob) {
        setUnlockedBlob(res.unlockedBlob);
        onSuccess(res.unlockedBlob);
      } else {
        setManualError(res.error || 'Incorrect name letters or birth year.');
      }
    } catch (err: any) {
      setManualError(err.message || 'Unlock failed.');
    } finally {
      setManualLoading(false);
    }
  };

  const handlePanSubmit = async () => {
    if (cleanPanDigits.length < 4 && !panNumber.trim()) {
      setManualError('Enter Date of Birth in DDMMYYYY format (e.g. 18032006).');
      return;
    }
    setManualError('');
    setManualLoading(true);

    try {
      const res = await PdfUnlocker.unlockPan(item.file, cleanPanDigits, panNumber);
      if (res.success && res.unlockedBlob) {
        setUnlockedBlob(res.unlockedBlob);
        onSuccess(res.unlockedBlob);
      } else {
        setManualError(res.error || 'Incorrect Date of Birth or PAN number.');
      }
    } catch (err: any) {
      setManualError(err.message || 'Unlock failed.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleUniversalSubmit = async () => {
    if (!universalPassword) {
      setManualError('Please enter the password.');
      return;
    }
    setManualError('');
    setManualLoading(true);

    try {
      const res = await PdfUnlocker.unlockUniversal(item.file, universalPassword);
      if (res.success && res.unlockedBlob) {
        setUnlockedBlob(res.unlockedBlob);
        onSuccess(res.unlockedBlob);
      } else {
        setManualError('Incorrect password.');
      }
    } catch (err: any) {
      setManualError(err.message || 'Unlock failed.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!unlockedBlob) return;
    await saveFile(unlockedBlob, 'unlocked_' + item.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 text-zinc-100 rounded-2xl w-full max-w-lg border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Unlock className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-sm sm:text-base text-zinc-100 truncate">
                {unlockedBlob ? 'Document Decrypted' : 'PDF Unlocker'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* State 1: Running Auto-Unlock */}
          {isAutoUnlocking && (
            <div className="py-6 text-center space-y-4">
              <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-200">Scanning Document...</h4>
                <p className="text-xs text-zinc-400 px-4">{statusMessage}</p>
              </div>
              <button
                onClick={() => {
                  setIsAutoUnlocking(false);
                  setShowManualFallback(true);
                }}
                className="text-xs text-zinc-400 hover:text-emerald-400 underline pt-2"
              >
                Skip auto-scan and enter details
              </button>
            </div>
          )}

          {/* State 2: Successfully Unlocked */}
          {!isAutoUnlocking && unlockedBlob && (
            <div className="text-center py-4 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-zinc-100">Encryption Permanently Removed!</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  This PDF will never ask for a password again. Quality, layout, and text formatting are 100% preserved.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save Unlocked PDF</span>
              </button>
            </div>
          )}

          {/* State 3: Manual Presets (Aadhaar, PAN, Universal) */}
          {!isAutoUnlocking && !unlockedBlob && showManualFallback && (
            <div className="space-y-4">
              {/* Clean Preset Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => {
                    setActivePreset('aadhaar');
                    setManualError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-medium transition-all ${
                    activePreset === 'aadhaar'
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Aadhaar</span>
                </button>
                <button
                  onClick={() => {
                    setActivePreset('pan');
                    setManualError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-medium transition-all ${
                    activePreset === 'pan'
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">PAN Card</span>
                </button>
                <button
                  onClick={() => {
                    setActivePreset('universal');
                    setManualError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-medium transition-all ${
                    activePreset === 'universal'
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileKey className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Password</span>
                </button>
              </div>

              {/* 1. Aadhaar Mode: 4 letters + Year */}
              {activePreset === 'aadhaar' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Aadhaar standard rule:</span>
                    <span className="font-mono text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      FIRST 4 LETTERS + YYYY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">
                        First 4 Letters of Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RISH"
                        value={aadhaarLetters}
                        onChange={(e) => setAadhaarLetters(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono tracking-wider text-white focus:border-emerald-500 outline-none uppercase"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Enter first 4 letters in CAPITAL (e.g. RISH)
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">
                        Birth Year (YYYY)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="e.g. 2006"
                        value={aadhaarYear}
                        onChange={(e) => setAadhaarYear(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 outline-none"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Leave blank to auto-test all years
                      </p>
                    </div>
                  </div>

                  {cleanAadhaarPrefix && (
                    <div className="text-center py-1">
                      <span className="text-[11px] text-zinc-400">
                        Generated key:{' '}
                        <strong className="font-mono text-emerald-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {aadhaarPreview}
                        </strong>
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleAadhaarSubmit}
                    disabled={manualLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    {manualLoading ? 'Testing Aadhaar Key...' : 'Unlock Aadhaar Card'}
                  </button>
                </div>
              )}

              {/* 2. PAN Card Mode: DOB (DDMMYYYY) */}
              {activePreset === 'pan' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>e-PAN standard rule:</span>
                    <span className="font-mono text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      DOB in DDMMYYYY
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">
                      Date of Birth (DDMMYYYY)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 18032006 or 18/03/2006"
                      value={panDob}
                      onChange={(e) => setPanDob(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono tracking-wider text-white focus:border-emerald-500 outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Example: 18 March 2006 is entered as <strong>18032006</strong>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">
                      PAN Number (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 outline-none uppercase"
                    />
                  </div>

                  {cleanPanDigits && (
                    <div className="text-center py-1">
                      <span className="text-[11px] text-zinc-400">
                        Tested key:{' '}
                        <strong className="font-mono text-emerald-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {panPreview}
                        </strong>
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handlePanSubmit}
                    disabled={manualLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    {manualLoading ? 'Testing PAN Key...' : 'Unlock PAN Card'}
                  </button>
                </div>
              )}

              {/* 3. Universal Mode: Any PDF / Bank Statement */}
              {activePreset === 'universal' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400">
                    Enter the password for bank statements, salary slips, or any protected document.
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">
                      Document Password
                    </label>
                    <input
                      type="text"
                      placeholder="Enter password or PIN"
                      value={universalPassword}
                      onChange={(e) => setUniversalPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleUniversalSubmit}
                    disabled={manualLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    {manualLoading ? 'Decrypting...' : 'Remove Password'}
                  </button>
                </div>
              )}

              {manualError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{manualError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
