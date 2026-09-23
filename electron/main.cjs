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
    title: 'Omnisize | Zero-Trust Media Compressor & Studio',
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

  // Prevent unauthorized new windows or external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  let forceQuit = false;

  mainWindow.on('close', (e) => {
    if (forceQuit) return;
    e.preventDefault();
    mainWindow.webContents.send('request-app-close');
  });

  ipcMain.on('confirm-app-close', () => {
    forceQuit = true;
    if (mainWindow) mainWindow.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
