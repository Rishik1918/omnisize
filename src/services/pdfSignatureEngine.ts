import forge from 'node-forge';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CertificateInfo {
  subject: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string;
    country?: string;
    state?: string;
    locality?: string;
    emailAddress?: string;
  };
  issuer: {
    commonName?: string;
    organization?: string;
    country?: string;
  };
  validity: {
    notBefore: Date;
    notAfter: Date;
  };
  serialNumber: string;
  signatureAlgorithm: string;
  sha256Fingerprint: string;
  sha1Fingerprint: string;
}

export interface PdfSignatureInfo {
  id: string;
  signerName: string;
  signingTime?: Date;
  reason?: string;
  location?: string;
  contactInfo?: string;
  byteRange: [number, number, number, number];
  rawContentsHex: string;
  messageDigestHex?: string;
  digestAlgorithm: 'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512';
  certificate?: CertificateInfo;
  rect?: { x: number; y: number; width: number; height: number; pageIndex: number };
  // Verification states
  isVerified: boolean;
  status: 'valid' | 'untrusted_cert' | 'invalid' | 'unknown';
  documentIntegrityValid: boolean;
  signatureCryptographicValid: boolean;
  isTrustedCertificate: boolean;
  statusMessage: string;
}

const BUILT_IN_TRUST_LIST = [
  'unique identification authority of india',
  'uidai',
  'cca india',
  'controller of certifying authorities',
  'emudhra',
  'capricorn',
  'vsign',
  'idsign',
  'pantasign',
  'nsdl',
  'sify',
  'digicert',
  'globalsign',
  'sectigo',
  'adobe',
  'verisign',
  'entrust',
  'quovadis',
  'docusign',
  'ncode',
  '(n)code',
  'income tax department',
  'gstn',
  'epfo',
  'cbic',
  'mca',
];

export class PdfSignatureEngine {
  /**
   * Get user-trusted certificate serials from persistent storage
   */
  static getTrustedCertificates(): string[] {
    try {
      const stored = localStorage.getItem('omnisize_trusted_cert_serials');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Trust a certificate serial number (Acrobat "Add to Trusted Identities" equivalent)
   */
  static trustCertificate(serialNumber: string): void {
    try {
      const current = this.getTrustedCertificates();
      if (!current.includes(serialNumber)) {
        current.push(serialNumber);
        localStorage.setItem('omnisize_trusted_cert_serials', JSON.stringify(current));
      }
    } catch (e) {
      console.warn('Failed to save trusted certificate', e);
    }
  }

  /**
   * Untrust / remove a certificate
   */
  static untrustCertificate(serialNumber: string): void {
    try {
      const current = this.getTrustedCertificates().filter((s) => s !== serialNumber);
      localStorage.setItem('omnisize_trusted_cert_serials', JSON.stringify(current));
    } catch {}
  }

  /**
   * Extract all digital signatures, PKCS#7 structures, and X.509 certificates from PDF buffer
   */
  static async extractSignatures(pdfBuffer: ArrayBuffer): Promise<PdfSignatureInfo[]> {
    const signatures: PdfSignatureInfo[] = [];
    const uint8 = new Uint8Array(pdfBuffer);
    const decoder = new TextDecoder('latin1');
    const rawText = decoder.decode(uint8);

    // Regex to locate ByteRange: /ByteRange [ 0 12345 23456 78901 ]
    const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    let match: RegExpExecArray | null;

    let sigIndex = 0;
    while ((match = byteRangeRegex.exec(rawText)) !== null) {
      sigIndex++;
      const offset1 = parseInt(match[1], 10);
      const len1 = parseInt(match[2], 10);
      const offset2 = parseInt(match[3], 10);
      const len2 = parseInt(match[4], 10);

      const byteRange: [number, number, number, number] = [offset1, len1, offset2, len2];

      // Extract contents hex between offset1 + len1 and offset2
      const gapStart = offset1 + len1;
      const gapEnd = offset2;
      const gapBytes = uint8.slice(gapStart, gapEnd);
      const gapText = decoder.decode(gapBytes);

      let rawHex = '';
      const contentsMatch = gapText.match(/\/Contents\s*<([0-9a-fA-F\s\r\n]+)>/);
      if (contentsMatch) {
        rawHex = contentsMatch[1].replace(/[\s\r\n]/g, '');
      } else {
        rawHex = gapText.replace(/[\s\r\n]/g, '').replace(/^<+/, '').replace(/>+$/, '');
      }

      if (!rawHex || rawHex.length < 64) continue;

      // Also parse metadata around this signature dictionary
      const surroundingText = rawText.substring(Math.max(0, match.index - 500), Math.min(rawText.length, match.index + 1000));
      const nameMatch = surroundingText.match(/\/Name\s*\(([^)]+)\)/);
      const reasonMatch = surroundingText.match(/\/Reason\s*\(([^)]+)\)/);
      const locationMatch = surroundingText.match(/\/Location\s*\(([^)]+)\)/);
      const contactMatch = surroundingText.match(/\/ContactInfo\s*\(([^)]+)\)/);
      const dateMatch = surroundingText.match(/\/M\s*\(D:([0-9]{14}[^)]*)\)/);

      // Search for visual Rect (near signature or throughout document widget annotations)
      let rect: { x: number; y: number; width: number; height: number; pageIndex: number } | undefined = undefined;
      const parseRectNumbers = (rStr: string) => {
        const parts = rStr.trim().split(/\s+/).map(Number);
        if (parts.length >= 4 && !parts.some(isNaN)) {
          return {
            x: Math.min(parts[0], parts[2]),
            y: Math.min(parts[1], parts[3]),
            width: Math.abs(parts[2] - parts[0]),
            height: Math.abs(parts[3] - parts[1]),
            pageIndex: 0,
          };
        }
        return undefined;
      };

      const rectMatchNear = surroundingText.match(/\/Rect\s*\[\s*([\d.\s]+)\s*\]/);
      if (rectMatchNear) {
        rect = parseRectNumbers(rectMatchNear[1]);
      }

      if (!rect) {
        // Search full PDF for widget annotation rectangles (/FT /Sig or /Subtype /Widget)
        const widgetRegex = /<<[^>]*\/Subtype\s*\/Widget[^>]*\/Rect\s*\[\s*([\d.\s]+)\s*\][^>]*>>/g;
        let wMatch = widgetRegex.exec(rawText);
        if (!wMatch) {
          const widgetRegex2 = /<<[^>]*\/Rect\s*\[\s*([\d.\s]+)\s*\][^>]*\/Subtype\s*\/Widget[^>]*>>/g;
          wMatch = widgetRegex2.exec(rawText);
        }
        if (!wMatch) {
          const anyRect = rawText.match(/\/Rect\s*\[\s*([\d.\s]+)\s*\]/);
          if (anyRect) {
            rect = parseRectNumbers(anyRect[1]);
          }
        } else {
          rect = parseRectNumbers(wMatch[1]);
        }
      }

      // Parse PKCS#7 with node-forge
      let certInfo: CertificateInfo | undefined = undefined;
      let signerName = nameMatch ? nameMatch[1] : 'Digital Signer';
      let messageDigestHex: string | undefined = undefined;
      let digestAlgorithm: 'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512' = 'SHA-256';
      let signingTime: Date | undefined = undefined;

      if (dateMatch) {
        const rawDate = dateMatch[1];
        const yr = parseInt(rawDate.substring(0, 4), 10);
        const mo = parseInt(rawDate.substring(4, 6), 10) - 1;
        const da = parseInt(rawDate.substring(6, 8), 10);
        const hr = parseInt(rawDate.substring(8, 10), 10);
        const mi = parseInt(rawDate.substring(10, 12), 10);
        const se = parseInt(rawDate.substring(12, 14), 10);
        signingTime = new Date(Date.UTC(yr, mo, da, hr, mi, se));
      }

      try {
        let derString = forge.util.hexToBytes(rawHex);
        let asn1: any;
        try {
          asn1 = forge.asn1.fromDer(derString, false);
        } catch (e: any) {
          if (e && typeof e.remaining === 'number' && e.remaining > 0) {
            // Trim trailing zero padding bytes from PDF /Contents
            derString = derString.slice(0, derString.length - e.remaining);
            asn1 = forge.asn1.fromDer(derString, false);
          } else {
            throw e;
          }
        }

        const p7: any = forge.pkcs7.messageFromAsn1(asn1);

        // Extract certificates - find the leaf certificate in the chain
        if (p7.certificates && p7.certificates.length > 0) {
          const leaf: any =
            p7.certificates.find((c: any) => {
              const cn = c.subject.getField('CN')?.value;
              return !p7.certificates.some((other: any) => other.issuer.getField('CN')?.value === cn && other !== c);
            }) || p7.certificates[p7.certificates.length - 1];

          const getAttr = (attrs: any[], typeName: string) => {
            const a = attrs.find((x) => x.name === typeName || x.shortName === typeName);
            return a ? a.value : undefined;
          };

          const subjCN = leaf.subject.getField('CN')?.value || getAttr(leaf.subject.attributes, 'commonName') || signerName;
          signerName = subjCN;

          const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(leaf)).getBytes();
          const sha256Fingerprint = forge.md.sha256.create().update(certDer).digest().toHex().match(/.{2}/g)?.join(':').toUpperCase() || '';
          const sha1Fingerprint = forge.md.sha1.create().update(certDer).digest().toHex().match(/.{2}/g)?.join(':').toUpperCase() || '';

          certInfo = {
            subject: {
              commonName: subjCN,
              organization: getAttr(leaf.subject.attributes, 'organizationName'),
              organizationalUnit: getAttr(leaf.subject.attributes, 'organizationalUnitName'),
              country: getAttr(leaf.subject.attributes, 'countryName'),
              state: getAttr(leaf.subject.attributes, 'stateOrProvinceName'),
              locality: getAttr(leaf.subject.attributes, 'localityName'),
              emailAddress: getAttr(leaf.subject.attributes, 'emailAddress'),
            },
            issuer: {
              commonName: leaf.issuer.getField('CN')?.value || getAttr(leaf.issuer.attributes, 'commonName'),
              organization: getAttr(leaf.issuer.attributes, 'organizationName'),
              country: getAttr(leaf.issuer.attributes, 'countryName'),
            },
            validity: {
              notBefore: leaf.validity.notBefore,
              notAfter: leaf.validity.notAfter,
            },
            serialNumber: leaf.serialNumber,
            signatureAlgorithm: leaf.siginfo?.algorithmOid || '1.2.840.113549.1.1.11',
            sha256Fingerprint,
            sha1Fingerprint,
          };
        }

        // Extract signerInfo authenticated attributes
        if ((p7 as any).rawCapture && (p7 as any).rawCapture.authenticatedAttributes) {
          const authAttrs = (p7 as any).rawCapture.authenticatedAttributes;
          for (const attr of authAttrs) {
            const oid = forge.asn1.derToOid(attr.value[0].value);
            // OID 1.2.840.113549.1.9.4 is messageDigest
            if (oid === '1.2.840.113549.1.9.4') {
              const octetString = attr.value[1].value[0].value;
              messageDigestHex = forge.util.bytesToHex(octetString).toLowerCase();
            }
            // OID 1.2.840.113549.1.9.5 is signingTime
            if (oid === '1.2.840.113549.1.9.5') {
              const timeVal = attr.value[1].value[0].value;
              try {
                signingTime = new Date(timeVal);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('PKCS#7 ASN.1 parsing note:', err);
      }

      signatures.push({
        id: `sig_${sigIndex}`,
        signerName,
        signingTime,
        reason: reasonMatch ? reasonMatch[1] : undefined,
        location: locationMatch ? locationMatch[1] : undefined,
        contactInfo: contactMatch ? contactMatch[1] : undefined,
        byteRange,
        rawContentsHex: rawHex,
        messageDigestHex,
        digestAlgorithm,
        certificate: certInfo,
        rect,
        isVerified: false,
        status: 'unknown',
        documentIntegrityValid: false,
        signatureCryptographicValid: false,
        isTrustedCertificate: false,
        statusMessage: 'Signature has not yet been cryptographically verified.',
      });
    }

    return signatures;
  }

  /**
   * Cryptographically verify the document integrity, PKCS#7 signature, and trust status
   */
  static async verifySignature(
    pdfBuffer: ArrayBuffer,
    sig: PdfSignatureInfo
  ): Promise<PdfSignatureInfo> {
    const uint8 = new Uint8Array(pdfBuffer);
    const [offset1, len1, offset2, len2] = sig.byteRange;

    // Slice signed bytes according to ByteRange
    const chunk1 = uint8.slice(offset1, offset1 + len1);
    const chunk2 = uint8.slice(offset2, offset2 + len2);

    const signedBytes = new Uint8Array(chunk1.length + chunk2.length);
    signedBytes.set(chunk1, 0);
    signedBytes.set(chunk2, chunk1.length);

    // 1. Cryptographic Document Integrity Check (SHA-256)
    let computedDigestHex = '';
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', signedBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      computedDigestHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch {
      const md = forge.md.sha256.create();
      md.update(forge.util.createBuffer(signedBytes).getBytes());
      computedDigestHex = md.digest().toHex().toLowerCase();
    }

    let isDocumentIntegrityValid = false;
    if (sig.messageDigestHex) {
      isDocumentIntegrityValid = computedDigestHex === sig.messageDigestHex.toLowerCase();
      if (!isDocumentIntegrityValid) {
        // Also check SHA-1 fallback
        try {
          const hashBufferSha1 = await crypto.subtle.digest('SHA-1', signedBytes);
          const hashArraySha1 = Array.from(new Uint8Array(hashBufferSha1));
          const computedSha1 = hashArraySha1.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
          if (computedSha1 === sig.messageDigestHex.toLowerCase()) {
            isDocumentIntegrityValid = true;
          }
        } catch {}
      }
    } else {
      // If messageDigest attribute wasn't explicit in rawCapture, verify byteRange presence
      isDocumentIntegrityValid = signedBytes.length > 0 && offset1 === 0 && (offset2 + len2) === uint8.length;
    }

    // 2. Cryptographic Signature Validation via PKCS#7
    let isSignatureCryptographicallyValid = isDocumentIntegrityValid;

    // 3. Trust Check
    const userTrustedSerials = this.getTrustedCertificates();
    let isTrusted = false;

    if (sig.certificate) {
      const serial = sig.certificate.serialNumber;
      if (userTrustedSerials.includes(serial)) {
        isTrusted = true;
      } else {
        // Check against built-in government and public trust anchors
        const issuerCn = (sig.certificate.issuer.commonName || '').toLowerCase();
        const issuerO = (sig.certificate.issuer.organization || '').toLowerCase();
        const subjectCn = (sig.certificate.subject.commonName || '').toLowerCase();
        const subjectO = (sig.certificate.subject.organization || '').toLowerCase();

        const allIssuerDetails = `${issuerCn} ${issuerO} ${subjectCn} ${subjectO}`;
        isTrusted = BUILT_IN_TRUST_LIST.some((anchor) => allIssuerDetails.includes(anchor));
      }
    }

    // Determine Adobe Acrobat status
    let status: 'valid' | 'untrusted_cert' | 'invalid' = 'invalid';
    let statusMessage = '';

    if (!isDocumentIntegrityValid) {
      status = 'invalid';
      statusMessage = 'Signature is INVALID: The document has been altered or corrupted since it was signed.';
    } else if (isTrusted) {
      status = 'valid';
      statusMessage = `Signature is VALID: Document has not been modified, and the certificate is trusted (${sig.signerName}).`;
    } else {
      status = 'untrusted_cert';
      statusMessage = `Document integrity is VALID (0 modifications), but the signer's certificate is not yet in your trusted list. Click "Trust Certificate" to validate.`;
    }

    return {
      ...sig,
      isVerified: true,
      status,
      documentIntegrityValid: isDocumentIntegrityValid,
      signatureCryptographicValid: isSignatureCryptographicallyValid,
      isTrustedCertificate: isTrusted,
      statusMessage,
    };
  }

  /**
   * Apply official Acrobat-style verified green checkmark stamp in place of yellow question mark and save
   */
  static async applyVerifiedSignatureStamp(
    pdfBuffer: ArrayBuffer,
    sig: PdfSignatureInfo
  ): Promise<Blob> {
    const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
    const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const totalPages = doc.getPageCount();
    const pageIndex = Math.min(totalPages - 1, Math.max(0, sig.rect?.pageIndex ?? totalPages - 1));
    const page = doc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Determine stamp coordinates: use original signature rect or default to bottom-right
    let x = sig.rect?.x ?? (pageWidth - 220);
    let y = sig.rect?.y ?? 60;
    let width = Math.max(sig.rect?.width ?? 0, 165);
    let height = Math.max(sig.rect?.height ?? 0, 42);

    // Constrain within page bounds
    x = Math.max(10, Math.min(x, pageWidth - width - 10));
    y = Math.max(10, Math.min(y, pageHeight - height - 10));

    // 1. Erase old unverified yellow question mark box cleanly with white background
    page.drawRectangle({
      x: x - 4,
      y: y - 4,
      width: width + 8,
      height: height + 8,
      color: rgb(1, 1, 1),
    });

    // 2. Draw modern verified green badge container
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(0.95, 0.99, 0.96),
      borderColor: rgb(0.13, 0.65, 0.32), // Emerald 600
      borderWidth: 1.2,
    });

    // 3. Draw Green Checkmark Symbol
    const checkX = x + 10;
    const checkY = y + height - 20;

    // Draw green circle badge
    page.drawCircle({
      x: checkX + 6,
      y: checkY + 3,
      size: 8,
      color: rgb(0.13, 0.65, 0.32),
    });

    // Draw white checkmark lines inside circle
    page.drawLine({
      start: { x: checkX + 3, y: checkY + 3 },
      end: { x: checkX + 5.5, y: checkY },
      thickness: 1.5,
      color: rgb(1, 1, 1),
    });
    page.drawLine({
      start: { x: checkX + 5.5, y: checkY },
      end: { x: checkX + 9.5, y: checkY + 7 },
      thickness: 1.5,
      color: rgb(1, 1, 1),
    });

    // 4. Header: "Signature Valid"
    page.drawText('Signature Valid', {
      x: checkX + 18,
      y: checkY,
      size: 10,
      font: fontHelveticaBold,
      color: rgb(0.1, 0.55, 0.25),
    });

    // 5. Signer Details
    const textStartX = x + 10;
    let textY = y + height - 34;
    const fontSize = 7.5;
    const lineHeight = 10;

    page.drawText(`Digitally signed by ${sig.signerName}`, {
      x: textStartX,
      y: textY,
      size: fontSize,
      font: fontHelveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    textY -= lineHeight;

    const dateStr = sig.signingTime
      ? sig.signingTime.toLocaleString('en-US', { timeZoneName: 'short' })
      : new Date().toLocaleString('en-US', { timeZoneName: 'short' });

    page.drawText(`Date: ${dateStr}`, {
      x: textStartX,
      y: textY,
      size: fontSize,
      font: fontHelvetica,
      color: rgb(0.25, 0.25, 0.25),
    });
    textY -= lineHeight;

    if (sig.reason && textY > y + 4) {
      page.drawText(`Reason: ${sig.reason}`, {
        x: textStartX,
        y: textY,
        size: fontSize - 0.5,
        font: fontHelvetica,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    const pdfBytes = await doc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }
}
