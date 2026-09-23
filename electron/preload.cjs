const { contextBridge, ipcRenderer } = require('electron');

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
});
