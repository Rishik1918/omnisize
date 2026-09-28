import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Universal file saver that works reliably across:
 * 1. Web browser: standard dynamic <a> download with blob revocation
 * 2. Electron desktop: dynamic <a> download
 * 3. Capacitor Android: Writes file to device storage via Filesystem & launches native Android Save/Share Sheet
 */
export interface SaveOptions {
  existingPath?: string | null;
  isSaveAs?: boolean;
  fileHandle?: any;
}

/**
 * Universal file saver that saves directly to the existing file path (no prompt)
 * when available, or prompts Save As when requested or required.
 */
export async function saveFileDirectlyOrPrompt(
  blob: Blob,
  filename: string,
  options?: SaveOptions
): Promise<{ success: boolean; filePath?: string; message?: string }> {
  try {
    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;

    // 1. Electron Desktop Environment
    if (electronAPI) {
      const buffer = await blob.arrayBuffer();

      // If user did NOT explicitly request "Save As" and we have an existing file path, overwrite directly
      if (!options?.isSaveAs && options?.existingPath) {
        if (typeof electronAPI.saveFileDirect === 'function') {
          const res = await electronAPI.saveFileDirect(options.existingPath, buffer);
          if (res?.success) {
            return { success: true, filePath: options.existingPath, message: `Saved directly to ${options.existingPath}` };
          }
        }
      }

      // Explicit "Save As" or unknown existing file path in Electron
      if (typeof electronAPI.saveFileDialog === 'function') {
        const res = await electronAPI.saveFileDialog(options?.existingPath || filename, buffer);
        if (res?.success && res.filePath) {
          return { success: true, filePath: res.filePath, message: `Saved to ${res.filePath}` };
        } else if (res?.canceled) {
          return { success: false, message: 'Save cancelled by user' };
        }
      }
    }

    // 2. Web Browser File System Access API
    if (!options?.isSaveAs && options?.fileHandle && typeof options.fileHandle.createWritable === 'function') {
      try {
        const writable = await options.fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, message: 'Saved successfully' };
      } catch (handleErr) {
        console.warn('File handle write note:', handleErr);
      }
    }

    // 3. Fallback to standard saveFile (Capacitor or Browser Download)
    return await saveFile(blob, filename);
  } catch (err: any) {
    console.error('saveFileDirectlyOrPrompt error:', err);
    return await saveFile(blob, filename);
  }
}

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
      // Browser / Electron Desktop fallback
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
