import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Lock,
  Calendar,
  Building,
  KeyRound,
  Download,
  Check,
  Loader2
} from 'lucide-react';
import { PdfSignatureInfo, PdfSignatureEngine } from '../../services/pdfSignatureEngine';
import { saveFile } from '../../utils/fileSaver';

interface SignatureCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  signature: PdfSignatureInfo;
  pdfBuffer: ArrayBuffer | null;
  onSignatureUpdated: (updatedSig: PdfSignatureInfo) => void;
}

export const SignatureCertificateModal: React.FC<SignatureCertificateModalProps> = ({
  isOpen,
  onClose,
  signature,
  pdfBuffer,
  onSignatureUpdated,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'issuer'>('summary');
  const [isStamping, setIsStamping] = useState(false);
  const [stampSuccess, setStampSuccess] = useState(false);
  const [currentSig, setCurrentSig] = useState<PdfSignatureInfo>(signature);

  const cert = currentSig.certificate;

  const handleTrustCertificate = async () => {
    if (!cert) return;
    PdfSignatureEngine.trustCertificate(cert.serialNumber);
    if (pdfBuffer) {
      const reVerified = await PdfSignatureEngine.verifySignature(pdfBuffer, currentSig);
      setCurrentSig(reVerified);
      onSignatureUpdated(reVerified);
    }
  };

  const handleStampAndSave = async () => {
    if (!pdfBuffer) return;
    try {
      setIsStamping(true);
      const verifiedBlob = await PdfSignatureEngine.applyVerifiedSignatureStamp(pdfBuffer, currentSig);
      await saveFile(verifiedBlob, `verified_signed_${Date.now()}.pdf`);
      setStampSuccess(true);
      setTimeout(() => setStampSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to stamp verified signature', err);
    } finally {
      setIsStamping(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Not available';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                currentSig.status === 'valid'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : currentSig.status === 'untrusted_cert'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
              }`}
            >
              {currentSig.status === 'valid' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : currentSig.status === 'untrusted_cert' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm">Digital Signature & Certificate Viewer</h3>
              <p className="text-[11px] text-zinc-500">
                Acrobat-Grade Cryptographic X.509 Certificate Validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Hero Banner */}
        <div
          className={`p-4 border-b ${
            currentSig.status === 'valid'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : currentSig.status === 'untrusted_cert'
              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/20 text-amber-800 dark:text-amber-300'
              : 'bg-red-50/70 dark:bg-red-950/20 border-red-500/20 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {currentSig.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {currentSig.status === 'untrusted_cert' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {currentSig.status === 'invalid' && <XCircle className="w-4 h-4 text-red-600" />}
                <span>
                  {currentSig.status === 'valid'
                    ? 'Signature is VALID and TRUSTED'
                    : currentSig.status === 'untrusted_cert'
                    ? 'Document Integrity VALID • Certificate Validity UNKNOWN'
                    : 'Signature is INVALID (Altered)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{currentSig.statusMessage}</p>
            </div>

            {currentSig.status === 'untrusted_cert' && cert && (
              <button
                onClick={handleTrustCertificate}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 flex-shrink-0"
              >
                Trust Certificate
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Signer Details
          </button>
          <button
            onClick={() => setActiveTab('issuer')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 ${
              activeTab === 'issuer'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Issuer & Trust
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                    Signer Name
                  </span>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {currentSig.signerName}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                    Signing Time
                  </span>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatDate(currentSig.signingTime)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Cryptographic Integrity
                </span>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    ByteRange: [{currentSig.byteRange.join(', ')}]
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    Hash Algorithm: {currentSig.digestAlgorithm}
                  </span>
                </div>
                {currentSig.messageDigestHex && (
                  <div className="font-mono text-[10px] text-zinc-500 bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 break-all">
                    Digest: {currentSig.messageDigestHex}
                  </div>
                )}
              </div>

              {currentSig.reason && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                    Reason
                  </span>
                  <div className="text-zinc-700 dark:text-zinc-300">{currentSig.reason}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && cert && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Subject Information
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-400">Common Name (CN):</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.subject.commonName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Organization (O):</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.subject.organization || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Unit (OU):</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.subject.organizationalUnit || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Country (C):</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.subject.country || 'IN'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Validity Period
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-400">Valid From:</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatDate(cert.validity.notBefore)}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Valid Until:</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatDate(cert.validity.notAfter)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Certificate Fingerprints
                </span>
                <div className="space-y-1.5 font-mono text-[10px] break-all">
                  <div>
                    <span className="text-zinc-400 font-sans">SHA-256 Fingerprint:</span>
                    <div className="bg-white dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {cert.sha256Fingerprint}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-sans">Serial Number:</span>
                    <div className="bg-white dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {cert.serialNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issuer' && cert && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Issuing Certificate Authority (CA)
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-zinc-400">Issuer CN:</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.issuer.commonName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Issuer Organization:</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.issuer.organization || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Country:</span>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cert.issuer.country || 'IN'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Trust Status
                </span>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    {currentSig.isTrustedCertificate ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Trusted by Omnisize Identity Store
                      </span>
                    ) : (
                      <span>Not in trusted certificate store</span>
                    )}
                  </div>
                  {!currentSig.isTrustedCertificate && (
                    <button
                      onClick={handleTrustCertificate}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                    >
                      Trust Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleStampAndSave}
            disabled={isStamping || !pdfBuffer}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm active:scale-95 ${
              stampSuccess ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title="Stamp green checkmark signature badge and save verified document"
          >
            {isStamping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : stampSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{stampSuccess ? 'Verified & Saved!' : 'Stamp Green Tick & Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
