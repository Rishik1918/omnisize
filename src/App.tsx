import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { ImageOptionsModal } from './components/ImageOptionsModal';
import { WatermarkEditorModal } from './components/WatermarkEditorModal';
import { VideoOptionsModal } from './components/VideoOptionsModal';
import { DocumentOptionsModal } from './components/DocumentOptionsModal';
import { PdfUnlockerModal } from './components/PdfUnlockerModal';
import { ConverterView } from './components/ConverterView';
import { PdfStudioView } from './components/PdfStudio/PdfStudioView';
import { PdfEditorModal } from './components/PdfStudio/PdfEditorModal';
import { InitialChoiceScreen } from './components/InitialChoiceScreen';
import { BottomNav } from './components/BottomNav';
import { PdfPasswordPromptModal } from './components/PdfPasswordPromptModal';
import { ProcessedItem, MediaType, ImageProcessingOptions, VideoProcessingOptions, DocumentProcessingOptions } from './types';
import { ImageEngine } from './services/imageEngine';
import { VideoEngine } from './services/videoEngine';
import { DocumentEngine } from './services/documentEngine';
import { saveFile } from './utils/fileSaver';
import { ThemeManager } from './services/themeManager';
import { Play, AlertCircle } from 'lucide-react';

export default function App() {
  const [hasSelectedInitialMode, setHasSelectedInitialMode] = useState<boolean>(false);
  const [appMode, setAppMode] = useState<'compress' | 'convert' | 'pdfstudio'>('compress');
  const [externalEditorPdf, setExternalEditorPdf] = useState<File | null>(null);
  const [showDesktopCloseModal, setShowDesktopCloseModal] = useState<boolean>(false);

  useEffect(() => {
    ThemeManager.init();
  }, []);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'pdf' | 'unlock'>('all');
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<ProcessedItem | null>(null);
  const [watermarkModalItem, setWatermarkModalItem] = useState<ProcessedItem | null>(null);
  const [videoModalItem, setVideoModalItem] = useState<ProcessedItem | null>(null);
  const [docModalItem, setDocModalItem] = useState<ProcessedItem | null>(null);
  const [unlockModalItem, setUnlockModalItem] = useState<ProcessedItem | null>(null);
  const [passwordModalTarget, setPasswordModalTarget] = useState<{
    file: File;
    onSuccess: (unlockedFile: File) => void;
  } | null>(null);

  const detectType = (file: File): MediaType => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
    if (file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
    if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  const handleFilesAdded = (files: File[]) => {
    const newItems: ProcessedItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      type: detectType(file),
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);

    if (activeTab === 'unlock') {
      const firstPdf = newItems.find((i) => i.type === 'pdf');
      if (firstPdf) setUnlockModalItem(firstPdf);
    }
  };

  const handleIncomingFile = (file: File) => {
    setHasSelectedInitialMode(true);
    const type = detectType(file);
    if (type === 'pdf') {
      setAppMode('pdfstudio');
      setExternalEditorPdf(file);
    } else {
      setAppMode('compress');
      handleFilesAdded([file]);
    }
  };

  useEffect(() => {
    // 1. Electron Desktop listener (via preload bridge)
    const electronAPI = (window as any).electronAPI;
    let unsubOpen: (() => void) | undefined;
    let unsubClose: (() => void) | undefined;

    if (electronAPI) {
      if (typeof electronAPI.getInitialFile === 'function') {
        electronAPI.getInitialFile().then((fileData: any) => {
          if (fileData && fileData.data) {
            const ext = fileData.extension || fileData.name.split('.').pop() || '';
            const mimeType = ext === 'pdf' ? 'application/pdf' : fileData.mimeType || 'application/octet-stream';
            const file = new File([fileData.data], fileData.name, { type: mimeType });
            handleIncomingFile(file);
          }
        }).catch((err: any) => console.error('Error fetching initial desktop file:', err));
      }

      if (typeof electronAPI.onOpenFile === 'function') {
        unsubOpen = electronAPI.onOpenFile((fileData: any) => {
          if (fileData && fileData.data) {
            const ext = fileData.extension || fileData.name.split('.').pop() || '';
            const mimeType = ext === 'pdf' ? 'application/pdf' : fileData.mimeType || 'application/octet-stream';
            const file = new File([fileData.data], fileData.name, { type: mimeType });
            handleIncomingFile(file);
          }
        });
      }

      if (typeof electronAPI.onRequestAppClose === 'function') {
        unsubClose = electronAPI.onRequestAppClose(() => {
          setShowDesktopCloseModal(true);
        });
      }

      return () => {
        if (unsubOpen) unsubOpen();
        if (unsubClose) unsubClose();
      };
    }

    // 2. Android "Open With" intent listener
    const handleAndroidData = (payload: any) => {
      if (!payload || !payload.base64) return;
      try {
        const binaryString = atob(payload.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const file = new File([bytes], payload.name || 'document.pdf', {
          type: payload.mimeType || 'application/pdf',
        });
        handleIncomingFile(file);
      } catch (e) {
        console.error('Failed to parse external android file', e);
      }
    };

    (window as any).handleExternalAndroidFile = handleAndroidData;

    // Check if Android queued a pending file during cold start
    if ((window as any).__omnisize_pending_file) {
      handleAndroidData((window as any).__omnisize_pending_file);
      (window as any).__omnisize_pending_file = null;
    }
  }, []);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const processSingleItem = async (
    item: ProcessedItem,
    imageOpts?: ImageProcessingOptions,
    videoOpts?: VideoProcessingOptions,
    docOpts?: DocumentProcessingOptions
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'processing', progress: 5 } : i))
    );

    try {
      let resultBlob: Blob;

      if (item.type === 'image') {
        const opts = imageOpts || {
          mode: 'compress',
          quality: 0.82,
          maintainAspectRatio: true,
          stripMetadata: true,
        };
        resultBlob = await ImageEngine.processImage(item.file, opts, (p) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: p } : i)));
        });
      } else if (item.type === 'video') {
        const opts = videoOpts || {
          mode: 'compress',
          resolutionScale: 0.75,
          muteAudio: false,
        };
        resultBlob = await VideoEngine.processVideo(item.file, opts, (p) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: p } : i)));
        });
      } else {
        const opts = docOpts || {
          qualityLevel: 'maximum',
          compressEmbeddedImages: true,
          maxImageDimension: 1280,
          stripMetadata: true,
        };
        resultBlob = await DocumentEngine.processDocument(item.file, opts, (p) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: p } : i)));
        });
      }

      const resultUrl = URL.createObjectURL(resultBlob);
      const resultSize = resultBlob.size;
      const saved = Math.max(0, Math.round(((item.originalSize - resultSize) / item.originalSize) * 100));

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'done',
                progress: 100,
                resultBlob,
                resultUrl,
                resultSize,
                savedPercentage: saved,
              }
            : i
        )
      );
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (err?.name === 'PasswordException' || msg.toLowerCase().includes('password')) {
        setPasswordModalTarget({
          file: item.file,
          onSuccess: (unlockedFile) => {
            setPasswordModalTarget(null);
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, file: unlockedFile, status: 'idle', error: undefined } : i))
            );
            processSingleItem({ ...item, file: unlockedFile }, imageOpts, videoOpts, docOpts);
          },
        });
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', error: err.message } : i
        )
      );
    }
  };

  const handleProcessAll = async () => {
    for (const item of items) {
      if (item.status === 'idle') {
        await processSingleItem(item);
      }
    }
  };

  const handleDownload = async (item: ProcessedItem) => {
    if (!item.resultBlob) return;
    await saveFile(item.resultBlob, 'compressed_' + item.name);
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pdf') return item.type === 'pdf' || item.type === 'document';
    if (activeTab === 'unlock') return item.type === 'pdf';
    return item.type === activeTab;
  });

  const fileCounts = {
    all: items.length,
    image: items.filter((i) => i.type === 'image').length,
    video: items.filter((i) => i.type === 'video').length,
    pdf: items.filter((i) => i.type === 'pdf' || i.type === 'document').length,
    unlock: items.filter((i) => i.type === 'pdf').length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300 transition-colors duration-150">
      <Navbar
        appMode={appMode}
        setAppMode={(m) => {
          setAppMode(m);
          setHasSelectedInitialMode(true);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileCounts={fileCounts}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-8">
        {/* Initial Choice Screen (Shown on start until user chooses) */}
        {!hasSelectedInitialMode ? (
          <InitialChoiceScreen
            onSelectMode={(mode) => {
              setAppMode(mode);
              setHasSelectedInitialMode(true);
            }}
          />
        ) : appMode === 'convert' ? (
          /* Universal Format Converter Mode */
          <div className="space-y-4">
            <ConverterView />
          </div>
        ) : appMode === 'pdfstudio' ? (
          /* PDF Studio Suite Mode */
          <div className="space-y-4">
            <PdfStudioView />
          </div>
        ) : (
          /* Compressor Mode */
          <div className="space-y-4 sm:space-y-5">
            <DropZone onFilesAdded={handleFilesAdded} />

            {items.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{items.length}</span> file(s) queued
                </div>
                <button
                  onClick={handleProcessAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-sm active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Compress All</span>
                </button>
              </div>
            )}

            <FileList
              items={filteredItems}
              onRemove={handleRemove}
              onOpenOptions={(item) => {
                if (item.type === 'image') setSelectedItemForOptions(item);
                else if (item.type === 'video') setVideoModalItem(item);
                else setDocModalItem(item);
              }}
              onOpenUnlocker={(item) => setUnlockModalItem(item)}
              onProcessItem={(item) => processSingleItem(item)}
              onDownloadItem={handleDownload}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Nav on Mobile */}
      <BottomNav
        appMode={appMode}
        setAppMode={(m) => {
          setAppMode(m);
          setHasSelectedInitialMode(true);
        }}
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab)}
        onOpenUnlocker={() => {
          const firstPdf = items.find((i) => i.type === 'pdf');
          if (firstPdf) {
            setUnlockModalItem(firstPdf);
          } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf,.pdf';
            input.onchange = (e: any) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const newItem: ProcessedItem = {
                  id: Math.random().toString(36).substring(2, 9),
                  file,
                  name: file.name,
                  type: 'pdf',
                  originalSize: file.size,
                  previewUrl: URL.createObjectURL(file),
                  status: 'idle',
                  progress: 0,
                };
                setItems((prev) => [newItem, ...prev]);
                setUnlockModalItem(newItem);
              }
            };
            input.click();
          }
        }}
      />

      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500 mb-14 sm:mb-0">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>Omnisize • Studio & Universal Converter</span>
          <span className="text-zinc-400">
            100% Client-Side • Zero External Server Uploads
          </span>
        </div>
      </footer>

      {/* Modals */}
      {selectedItemForOptions && (
        <ImageOptionsModal
          item={selectedItemForOptions}
          isOpen={true}
          onClose={() => setSelectedItemForOptions(null)}
          onSave={(opts) => processSingleItem(selectedItemForOptions, opts)}
          onOpenWatermarkModal={() => setWatermarkModalItem(selectedItemForOptions)}
        />
      )}

      {watermarkModalItem && (
        <WatermarkEditorModal
          item={watermarkModalItem}
          isOpen={true}
          onClose={() => setWatermarkModalItem(null)}
          onApply={(blob) => {
            const url = URL.createObjectURL(blob);
            setItems((prev) =>
              prev.map((i) =>
                i.id === watermarkModalItem.id
                  ? {
                      ...i,
                      status: 'done',
                      resultBlob: blob,
                      resultUrl: url,
                      resultSize: blob.size,
                    }
                  : i
              )
            );
          }}
        />
      )}

      {videoModalItem && (
        <VideoOptionsModal
          item={videoModalItem}
          isOpen={true}
          onClose={() => setVideoModalItem(null)}
          onSave={(opts) => processSingleItem(videoModalItem, undefined, opts)}
        />
      )}

      {docModalItem && (
        <DocumentOptionsModal
          item={docModalItem}
          isOpen={true}
          onClose={() => setDocModalItem(null)}
          onSave={(opts) => processSingleItem(docModalItem, undefined, undefined, opts)}
        />
      )}

      {unlockModalItem && (
        <PdfUnlockerModal
          item={unlockModalItem}
          isOpen={true}
          onClose={() => setUnlockModalItem(null)}
          onSuccess={(unlockedBlob) => {
            const url = URL.createObjectURL(unlockedBlob);
            setItems((prev) =>
              prev.map((i) =>
                i.id === unlockModalItem.id
                  ? {
                      ...i,
                      status: 'done',
                      resultBlob: unlockedBlob,
                      resultUrl: url,
                      resultSize: unlockedBlob.size,
                    }
                  : i
              )
            );
          }}
        />
      )}

      {externalEditorPdf && (
        <PdfEditorModal
          isOpen={Boolean(externalEditorPdf)}
          onClose={() => setExternalEditorPdf(null)}
          initialFile={externalEditorPdf}
        />
      )}

      {passwordModalTarget && (
        <PdfPasswordPromptModal
          isOpen={true}
          file={passwordModalTarget.file}
          onSuccess={passwordModalTarget.onSuccess}
          onCancel={() => setPasswordModalTarget(null)}
        />
      )}

      {/* Desktop App Close Confirmation Modal */}
      {showDesktopCloseModal && (
        <div className="fixed inset-0 z-[9999999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Save Changes Before Closing?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Do you want to save any changes before exiting Omnisize? Any unsaved edits or in-progress operations will be lost if you exit without saving.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 sm:justify-end">
              <button
                onClick={() => setShowDesktopCloseModal(false)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel / Keep Working
              </button>
              <button
                onClick={() => {
                  setShowDesktopCloseModal(false);
                  (window as any).electronAPI?.confirmAppClose?.();
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors shadow-sm"
              >
                Exit Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
