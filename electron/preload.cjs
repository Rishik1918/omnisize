const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
  onOpenFile: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('open-file', handler);
    return () => ipcRenderer.removeListener('open-file', handler);
  },
  onRequestAppClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('request-app-close', handler);
    return () => ipcRenderer.removeListener('request-app-close', handler);
  },
  confirmAppClose: () => ipcRenderer.send('confirm-app-close'),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
      return file.path || null;
    } catch (e) {
      return file.path || null;
    }
  },
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
  saveFileDirect: (filePath, buffer, defaultName) =>
    ipcRenderer.invoke('save-file-direct', { filePath, defaultName, buffer }),
  saveFileDialog: (defaultName, buffer) =>
    ipcRenderer.invoke('save-file-dialog', { defaultName, buffer }),
});
