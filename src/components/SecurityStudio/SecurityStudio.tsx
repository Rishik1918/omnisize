import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Unlock,
  Lock,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  KeyRound,
  FileCheck,
  FileSpreadsheet,
  Archive,
  Layers,
  File
} from 'lucide-react';
import { UniversalSecurityEngine, SupportedFormat, SecurityOperationResult } from '../../services/universalSecurityEngine';
import { saveFile } from '../../utils/fileSaver';

export const SecurityStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'unlock' | 'lock'>('unlock');
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<SupportedFormat>('other');
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<SecurityOperationResult | null>(null);
  const [error, setError] = useState<string>('');

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [showUnlockPassword, setShowUnlockPassword] = useState<boolean>(false);
  const [presetType, setPresetType] = useState<'standard' | 'aadhaar' | 'pan'>('standard');
  const [aadhaarName, setAadhaarName] = useState<string>('');
  const [aadhaarYear, setAadhaarYear] = useState<string>('');
  const [panDob, setPanDob] = useState<string>('');

  // Lock state
  const [lockPassword, setLockPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showLockPassword, setShowLockPassword] = useState<boolean>(false);
  const [keyLength, setKeyLength] = useState<128 | 256>(256);
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(true);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError('');
    setStatusMessage('Analyzing encryption & document structure...');
    setIsProcessing(true);

    const format = UniversalSecurityEngine.getFormat(file);
    setFileFormat(format);

    try {
      const check = await UniversalSecurityEngine.checkEncryption(file);
      setIsEncrypted(check.isEncrypted);
      setIsProcessing(false);
      setStatusMessage('');
    } catch {
      setIsEncrypted(false);
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAutoUnlock = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError('');
    setResult(null);
    setStatusMessage('Running 1-Click Smart pattern discovery...');

    try {
      const res = await UniversalSecurityEngine.autoUnlock(selectedFile, (msg) => {
        setStatusMessage(msg);
      });

      if (res.success && res.blob) {
        setResult(res);
        setStatusMessage('Document successfully unlocked!');
      } else {
        setError(res.error || 'Auto-discovery did not find the password. Please enter it manually.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to auto-unlock file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualUnlock = async () => {
    if (!selectedFile) return;
    let pwd = unlockPassword;

    if (presetType === 'aadhaar') {
      const cleanName = aadhaarName.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
      const cleanYear = aadhaarYear.trim().replace(/[^0-9]/g, '').slice(0, 4);
      if (cleanName.length < 3 || cleanYear.length !== 4) {
        setError('Please enter at least 4 letters of the name and a 4-digit birth year (YYYY).');
        return;
      }
      pwd = cleanName + cleanYear;
    } else if (presetType === 'pan') {
      const cleanDob = panDob.trim().replace(/[^0-9]/g, '');
      if (cleanDob.length !== 8) {
        setError('Please enter the 8-digit Date of Birth in DDMMYYYY format.');
        return;
      }
      pwd = cleanDob;
    }

    if (!pwd) {
      setError('Please provide a password to unlock.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);
    setStatusMessage('Decrypting file...');

    try {
      const res = await UniversalSecurityEngine.unlock(selectedFile, pwd, (msg) => {
        setStatusMessage(msg);
      });

      if (res.success && res.blob) {
        setResult(res);
        setStatusMessage('Document successfully unlocked!');
      } else {
        setError(res.error || 'Incorrect password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to decrypt document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockDocument = async () => {
    if (!selectedFile) return;
    if (!lockPassword) {
      setError('Please enter an encryption password.');
      return;
    }
    if (lockPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);
    setStatusMessage('Encrypting document and sealing security metadata...');

    try {
      const res = await UniversalSecurityEngine.lock(
        selectedFile,
        {
          userPassword: lockPassword,
          confirmPassword,
          keyLength,
          allowPrinting,
          allowCopying,
          allowModifying,
        },
        (msg) => setStatusMessage(msg)
      );

      if (res.success && res.blob) {
        setResult(res);
        setStatusMessage('Document successfully encrypted and locked!');
      } else {
        setError(res.error || 'Failed to encrypt document.');
      }
    } catch (err: any) {
      setError(err?.message || 'Encryption failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = () => {
    if (!result?.blob || !result.fileName) return;
    saveFile(result.blob, result.fileName);
  };

  const getFormatIcon = (fmt: SupportedFormat) => {
    switch (fmt) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'word':
        return <FileCheck className="w-5 h-5 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'zip':
        return <Archive className="w-5 h-5 text-amber-500" />;
      default:
        return <File className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'None', color: 'bg-zinc-200 dark:bg-zinc-700', width: '0%' };
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '30%' };
    if (pwd.length < 10) return { label: 'Moderate', color: 'bg-amber-500', width: '65%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength(lockPassword);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Security & Protection Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  AES-256
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Universal offline encryption & decryption for PDF, Word (.docx), Excel (.xlsx), and ZIP archives.
              </p>
            </div>
          </div>
        </div>

        {/* Workstation Mode Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('unlock');
              setResult(null);
              setError('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'unlock'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Unlock className="w-4 h-4 text-emerald-500" />
            <span>Unlock & Decrypt</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('lock');
              setResult(null);
              setError('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'lock'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>Lock & Protect</span>
          </button>
        </div>
      </div>

      {/* File Upload / Selection Zone */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-10 sm:p-14 text-center cursor-pointer bg-white dark:bg-zinc-900/60 transition-all group shadow-xs"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.zip,application/pdf,application/zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {activeTab === 'unlock' ? 'Select File to Unlock / Decrypt' : 'Select File to Lock / Protect'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Drag and drop your file here, or click to browse.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                PDF (.pdf)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                Word (.docx)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                Excel (.xlsx)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                ZIP (.zip)
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {getFormatIcon(fileFormat)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>•</span>
                  <span className="uppercase font-semibold tracking-wider text-[11px] text-zinc-600 dark:text-zinc-300">
                    {fileFormat}
                  </span>
                  {isEncrypted !== null && (
                    <>
                      <span>•</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isEncrypted
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {isEncrypted ? 'Password Protected' : 'Unencrypted'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                setError('');
                setStatusMessage('');
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              Change File
            </button>
          </div>

          {/* TAB 1: UNLOCK WORKSTATION */}
          {activeTab === 'unlock' && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
              {/* PDF Smart 1-Click Auto-Unlock */}
              {fileFormat === 'pdf' && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1-Click Smart Auto-Unlocker</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Automatically cleans metadata permissions, testing empty keys, Aadhaar, and PAN patterns.
                    </p>
                  </div>
                  <button
                    disabled={isProcessing}
                    onClick={handleAutoUnlock}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all shrink-0"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Auto-Unlock</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Manual Password Station */}
              <div className="space-y-3">
                {fileFormat === 'pdf' && (
                  <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <button
                      onClick={() => setPresetType('standard')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        presetType === 'standard'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      General Password
                    </button>
                    <button
                      onClick={() => setPresetType('aadhaar')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        presetType === 'aadhaar'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      e-Aadhaar Pattern
                    </button>
                    <button
                      onClick={() => setPresetType('pan')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        presetType === 'pan'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      PAN Card (DOB)
                    </button>
                  </div>
                )}

                {presetType === 'standard' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Enter Document Password
                    </label>
                    <div className="relative">
                      <input
                        type={showUnlockPassword ? 'text' : 'password'}
                        value={unlockPassword}
                        onChange={(e) => setUnlockPassword(e.target.value)}
                        placeholder="Type password..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {presetType === 'aadhaar' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        First 4 Letters of Name
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={aadhaarName}
                        onChange={(e) => setAadhaarName(e.target.value.toUpperCase())}
                        placeholder="e.g. SREE"
                        className="w-full px-3 py-2 text-sm uppercase rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Birth Year (YYYY)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={aadhaarYear}
                        onChange={(e) => setAadhaarYear(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 2003"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {presetType === 'pan' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Date of Birth (DDMMYYYY)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={panDob}
                      onChange={(e) => setPanDob(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 15082000"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    disabled={isProcessing}
                    onClick={handleManualUnlock}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Decrypting...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Decrypt & Unlock Permanently</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOCK WORKSTATION */}
          {activeTab === 'lock' && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Set Document Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLockPassword ? 'text' : 'password'}
                      value={lockPassword}
                      onChange={(e) => setLockPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLockPassword(!showLockPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {showLockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      {strength.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {confirmPassword && confirmPassword !== lockPassword && (
                    <span className="text-[10px] text-red-500 block">Passwords do not match</span>
                  )}
                </div>
              </div>

              {/* Encryption & Permission Settings */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Encryption Standard
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      High-security cipher algorithm
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => setKeyLength(256)}
                      className={`text-xs px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                        keyLength === 256
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      AES-256 (PDF 2.0)
                    </button>
                    <button
                      onClick={() => setKeyLength(128)}
                      className={`text-xs px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                        keyLength === 128
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      AES-128
                    </button>
                  </div>
                </div>

                {/* PDF Specific Permissions */}
                {fileFormat === 'pdf' && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 space-y-2">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Viewer Permissions
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowPrinting}
                          onChange={(e) => setAllowPrinting(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Printing</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowCopying}
                          onChange={(e) => setAllowCopying(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Copying</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowModifying}
                          onChange={(e) => setAllowModifying(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Editing</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  disabled={isProcessing || !lockPassword || lockPassword !== confirmPassword}
                  onClick={handleLockDocument}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Encrypt & Protect Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Status Message / Spinner */}
          {statusMessage && (
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-indigo-500' : 'text-emerald-500'}`} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Result Banner */}
          {result && result.success && result.blob && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {activeTab === 'unlock' ? 'Decryption Completed Successfully' : 'Encryption Applied Successfully'}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {result.fileName} • {(result.blob.size / 1024 / 1024).toFixed(2)} MB
                    {result.matchedPassword && (
                      <span className="ml-2 font-mono text-[11px] bg-emerald-200/50 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                        Key: {result.matchedPassword}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadResult}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Saved File</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security Info Card */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Private, Zero-Knowledge Offline Cryptography</span>
        </div>
        <p>
          All decryption and encryption processes run entirely within your device's memory using compiled WebAssembly
          and cryptographic primitives. No documents, passwords, or hashes are ever transmitted over the network.
        </p>
      </div>
    </div>
  );
};
