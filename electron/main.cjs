const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let pendingFilePath = null;

function findFilePathInArgs(args) {
  if (!args || args.length === 0) return null;
  // Look for first non-flag argument that points to an existing file
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && !arg.startsWith('--') && !arg.startsWith('-')) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          return arg;
        }
      } catch (e) {}
    }
  }
  return null;
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = findFilePathInArgs(commandLine);
      if (filePath) {
        sendFileToRenderer(filePath);
      }
    }
  });
}

function sendFileToRenderer(filePath) {
  if (!mainWindow || !filePath) return;
  try {
    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    mainWindow.webContents.send('open-file', {
      name: filename,
      path: filePath,
      size: stat.size,
      data: buffer,
      extension: ext.replace('.', ''),
    });
  } catch (err) {
    console.error('Error reading external file:', err);
  }
}

// Handle initial launch arguments
pendingFilePath = findFilePathInArgs(process.argv);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 850,
    minHeight: 600,
    title: 'Omnisize',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingFilePath) {
      setTimeout(() => {
        sendFileToRenderer(pendingFilePath);
        pendingFilePath = null;
      }, 500);
    }
  });

  // Handle IPC request for initial file
  ipcMain.handle('get-initial-file', () => {
    if (pendingFilePath) {
      try {
        const filePath = pendingFilePath;
        pendingFilePath = null;
        const stat = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        return {
          name: path.basename(filePath),
          path: filePath,
          size: stat.size,
          data: buffer,
          extension: path.extname(filePath).toLowerCase().replace('.', ''),
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Handle IPC direct file overwrite (no prompt under any circumstances)
  ipcMain.handle('save-file-direct', async (_event, { filePath, defaultName, buffer }) => {
    try {
      let targetPath = filePath;
      if (!targetPath) {
        const desktopDir = app.getPath('desktop');
        targetPath = path.join(desktopDir, defaultName || 'document.pdf');
      }
      fs.writeFileSync(targetPath, Buffer.from(buffer));
      return { success: true, filePath: targetPath };
    } catch (err) {
      console.error('Error saving file directly:', err);
      return { success: false, error: err.message };
    }
  });

  // Handle IPC request for Desktop directory path
  ipcMain.handle('get-desktop-path', () => app.getPath('desktop'));

  // Handle IPC Save As dialog
  ipcMain.handle('save-file-dialog', async (_event, { defaultName, buffer }) => {
    try {
      const { dialog } = require('electron');
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName || 'document.pdf',
        filters: [
          { name: 'PDF Document', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return { success: true, filePath };
    } catch (err) {
      console.error('Error in save-file-dialog:', err);
      return { success: false, error: err.message };
    }
  });

  // Prevent unauthorized new windows or external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    mainWindow.webContents.send('request-app-close');
  });

  ipcMain.on('confirm-app-close', () => {
    isQuitting = true;
    if (mainWindow) {
      mainWindow.destroy();
      mainWindow = null;
    }
    app.exit(0);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.exit(0);
  }
});

