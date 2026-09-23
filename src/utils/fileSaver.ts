import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Universal file saver that works reliably across:
 * 1. Web browser: standard dynamic <a> download with blob revocation
 * 2. Electron desktop: dynamic <a> download
 * 3. Capacitor Android: Writes file to device storage via Filesystem & launches native Android Save/Share Sheet
 */
export async function saveFile(blob: Blob, filename: string): Promise<{ success: boolean; message?: string }> {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await blobToBase64(blob);

      // Write file to Cache directory first for sharing
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Also ensure it is written to Documents directory so it persists on device
      try {
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
        });
      } catch (docErr) {
        console.warn('Could not write directly to Documents, continuing with share dialog:', docErr);
      }

      // Prompt native Android share/save dialog
      try {
        await Share.share({
          title: filename,
          text: `Save or share ${filename}`,
          url: savedFile.uri,
          dialogTitle: `Save ${filename}`,
        });
      } catch (shareErr) {
        console.log('Share dialog closed or unavailable:', shareErr);
      }

      return { success: true, message: `Saved ${filename}` };
    } else {
      // Browser / Electron Desktop
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
      return { success: true };
    }
  } catch (err: any) {
    console.error('File saving failed:', err);
    // Ultimate fallback
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, message: err?.message || 'Failed to save file' };
    }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
