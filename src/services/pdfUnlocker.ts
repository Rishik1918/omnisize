import { createPdfToolkit, PdfToolkit } from 'pdfstudio';
import { qpdfWasmBase64 } from './qpdfWasmBase64';

export interface UnlockResult {
  success: boolean;
  unlockedBlob?: Blob;
  error?: string;
  isEncrypted: boolean;
  matchedPassword?: string;
  autoUnlocked?: boolean;
}

let toolkitPromise: Promise<PdfToolkit> | null = null;

async function initToolkit(): Promise<PdfToolkit> {
  // Decode base64 wasm directly in memory - 100% offline, zero network, works in Electron & Android WebView
  const binaryString = atob(qpdfWasmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const compiledModule = await WebAssembly.compile(bytes.buffer);
  return createPdfToolkit({ wasmModule: compiledModule });
}

function getToolkit(): Promise<PdfToolkit> {
  if (!toolkitPromise) {
    toolkitPromise = initToolkit();
  }
  return toolkitPromise;
}

export class PdfUnlocker {
  /**
   * Check if a PDF is encrypted
   */
  static async checkEncryption(file: File): Promise<boolean> {
    try {
      const toolkit = await getToolkit();
      const buffer = await file.arrayBuffer();
      return await toolkit.isEncrypted(new Uint8Array(buffer));
    } catch (e) {
      return true;
    }
  }

  /**
   * Permanently Decrypt PDF using QPDF WebAssembly
   */
  static async unlockWithPassword(file: File, password: string): Promise<UnlockResult> {
    try {
      const toolkit = await getToolkit();
      const buffer = await file.arrayBuffer();
      const decryptedBytes = await toolkit.unlock(new Uint8Array(buffer), { password });

      const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
      return {
        success: true,
        unlockedBlob: blob,
        isEncrypted: true,
        matchedPassword: password,
      };
    } catch (e: any) {
      return {
        success: false,
        error: 'Incorrect password',
        isEncrypted: true,
      };
    }
  }

  /**
   * 1-Click Smart Automatic Unlocker
   * Tests empty password, metadata, Aadhaar patterns, PAN card patterns, and standard keys.
   */
  static async autoUnlock(
    file: File,
    onProgress?: (status: string) => void
  ): Promise<UnlockResult> {
    onProgress?.('Checking encryption type and permissions...');

    // 1. Try empty password (strips permissions / owner password)
    const emptyRes = await this.unlockWithPassword(file, '');
    if (emptyRes.success) {
      emptyRes.autoUnlocked = true;
      return emptyRes;
    }

    // 2. Scan filename for potential PAN dates: DDMMYYYY or YYYYMMDD
    const dateMatch = file.name.match(/\b(\d{2})[-_]?(\d{2})[-_]?(\d{4})\b/);
    if (dateMatch) {
      onProgress?.('Testing date formulas detected in filename...');
      const d = dateMatch[1];
      const m = dateMatch[2];
      const y = dateMatch[3];
      const dateCandidates = [
        `${d}${m}${y}`,
        `${d}/${m}/${y}`,
        `${d}-${m}-${y}`,
        `${y}${m}${d}`,
      ];
      for (const pwd of dateCandidates) {
        const res = await this.unlockWithPassword(file, pwd);
        if (res.success) {
          res.autoUnlocked = true;
          return res;
        }
      }
    }

    // 3. Scan filename for PAN format (5 letters + 4 digits + 1 letter, e.g. ABCDE1234F)
    const panMatch = file.name.match(/\b([A-Z]{5}\d{4}[A-Z])\b/i);
    if (panMatch) {
      const pan = panMatch[1];
      for (const pwd of [pan.toUpperCase(), pan.toLowerCase()]) {
        const res = await this.unlockWithPassword(file, pwd);
        if (res.success) {
          res.autoUnlocked = true;
          return res;
        }
      }
    }

    // 4. Extract potential names from filename for Aadhaar formulas
    const rawTokens = file.name
      .replace(/\.pdf$/i, '')
      .split(/[^a-zA-Z]/)
      .filter((t) => t.length >= 3);

    const stopWords = new Set([
      'eaadhaar', 'aadhaar', 'aadhar', 'card', 'pdf', 'statement', 'doc',
      'document', 'download', 'downloaded', 'copy', 'final', 'print', 'new', 'official',
      'epan', 'pancard', 'salary', 'payslip', 'invoice', 'report'
    ]);

    const candidateNames = rawTokens.filter((t) => !stopWords.has(t.toLowerCase()));

    // Also inspect header metadata
    try {
      const buffer = await file.arrayBuffer();
      const headerStr = new TextDecoder('latin1').decode(buffer.slice(0, 8192));
      const authorMatch = headerStr.match(/\/Author\s*\(([^)]+)\)/i);
      const titleMatch = headerStr.match(/\/Title\s*\(([^)]+)\)/i);

      if (authorMatch && authorMatch[1]) {
        candidateNames.push(...authorMatch[1].split(/[^a-zA-Z]/).filter((t) => t.length >= 3));
      }
      if (titleMatch && titleMatch[1]) {
        candidateNames.push(...titleMatch[1].split(/[^a-zA-Z]/).filter((t) => t.length >= 3));
      }
    } catch (e) {
      // Ignore header scan errors
    }

    // 5. Test Aadhaar formula for each candidate name: First 4 letters in CAPS + Year (1950-2025)
    if (candidateNames.length > 0) {
      onProgress?.('Testing automatic Aadhaar formulas from filename tokens...');
      for (const rawName of candidateNames) {
        const cleanName = rawName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (cleanName.length < 3) continue;
        const prefix4 = cleanName.substring(0, 4);

        for (let y = 2025; y >= 1950; y--) {
          const candidatePwd = `${prefix4}${y}`;
          const res = await this.unlockWithPassword(file, candidatePwd);
          if (res.success) {
            res.autoUnlocked = true;
            return res;
          }
        }
      }
    }

    // 6. Test common default passwords
    onProgress?.('Testing standard default document keys...');
    const commonPasswords = [
      '1234', '123456', 'password', '0000', '1111', 'admin', '12345678', 'user',
      'Pass@123', 'Password@123'
    ];

    for (const pwd of commonPasswords) {
      const res = await this.unlockWithPassword(file, pwd);
      if (res.success) {
        res.autoUnlocked = true;
        return res;
      }
    }

    return {
      success: false,
      error: 'Could not auto-unlock. Select Aadhaar, PAN, or type password below.',
      isEncrypted: true,
      autoUnlocked: false,
    };
  }

  /**
   * Aadhaar Unlocker
   * Requires first 4 letters of name (in UPPERCASE) and 4-digit birth year (YYYY)
   * Example: Name "RISHIK", Year "2006" -> "RISH2006"
   */
  static async unlockAadhaar(
    file: File,
    nameOr4Letters: string,
    year: string
  ): Promise<UnlockResult> {
    const letters = nameOr4Letters.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const prefix4 = letters.substring(0, 4);
    const cleanYear = year.replace(/[^0-9]/g, '').trim();

    if (prefix4.length < 3) {
      return {
        success: false,
        error: 'Please enter at least 3-4 letters of the name.',
        isEncrypted: true,
      };
    }

    // Direct Aadhaar format: 4 CAPS + YYYY
    if (cleanYear.length === 4) {
      const candidates = [
        `${prefix4}${cleanYear}`,
        `${prefix4}${cleanYear}`.toLowerCase(),
        `${letters}${cleanYear}`,
      ];

      for (const pwd of candidates) {
        const res = await this.unlockWithPassword(file, pwd);
        if (res.success) return res;
      }
    }

    // If year is unknown, test all common birth years (1950-2025)
    for (let y = 2025; y >= 1950; y--) {
      const pwd = `${prefix4}${y}`;
      const res = await this.unlockWithPassword(file, pwd);
      if (res.success) return res;
    }

    return {
      success: false,
      error: `Could not unlock with name letters "${prefix4}" and year "${cleanYear}". Check spelling or year.`,
      isEncrypted: true,
    };
  }

  /**
   * PAN Card Unlocker (e-PAN)
   * Standard format is Date of Birth in DDMMYYYY (e.g. 18032006)
   * Also tests DD-MM-YYYY, DD/MM/YYYY, or PAN card number if provided.
   */
  static async unlockPan(
    file: File,
    dobInput: string,
    panNumber?: string
  ): Promise<UnlockResult> {
    const candidates: string[] = [];

    // Parse numbers from DOB input
    const digitsOnly = dobInput.replace(/[^0-9]/g, '');

    if (digitsOnly.length === 8) {
      // Could be DDMMYYYY or YYYYMMDD
      const d1 = digitsOnly.substring(0, 2);
      const m1 = digitsOnly.substring(2, 4);
      const y1 = digitsOnly.substring(4, 8);

      candidates.push(digitsOnly); // DDMMYYYY
      candidates.push(`${d1}/${m1}/${y1}`);
      candidates.push(`${d1}-${m1}-${y1}`);

      // In case user entered YYYY-MM-DD from HTML date picker
      if (parseInt(digitsOnly.substring(0, 4)) > 1900) {
        const y2 = digitsOnly.substring(0, 4);
        const m2 = digitsOnly.substring(4, 6);
        const d2 = digitsOnly.substring(6, 8);
        candidates.push(`${d2}${m2}${y2}`);
        candidates.push(`${d2}/${m2}/${y2}`);
        candidates.push(`${d2}-${m2}-${y2}`);
      }
    } else if (dobInput.trim()) {
      candidates.push(dobInput.trim());
    }

    // Test PAN number if provided
    if (panNumber && panNumber.trim()) {
      const cleanPan = panNumber.trim();
      candidates.push(cleanPan.toUpperCase());
      candidates.push(cleanPan.toLowerCase());
    }

    for (const pwd of candidates) {
      const res = await this.unlockWithPassword(file, pwd);
      if (res.success) return res;
    }

    return {
      success: false,
      error: 'Could not unlock PAN card. Ensure Date of Birth is entered in DDMMYYYY format.',
      isEncrypted: true,
    };
  }

  /**
   * Universal Unlocker
   * Works for any locked document (Bank statements, payslips, custom passwords)
   */
  static async unlockUniversal(
    file: File,
    input: string
  ): Promise<UnlockResult> {
    const trimmed = input.trim();
    const candidates = [
      trimmed,
      trimmed.toUpperCase(),
      trimmed.toLowerCase(),
      input, // exact with whitespace
    ];

    for (const pwd of candidates) {
      const res = await this.unlockWithPassword(file, pwd);
      if (res.success) return res;
    }

    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
      isEncrypted: true,
    };
  }
}
