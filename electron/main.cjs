const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let pendingFilePath = null;

class FileLockManager {
  constructor() {
    this.worker = null;
    this.lockedFiles = new Map(); // id -> { filePath }
    this.nextId = 1;
    this.initWorker();
  }

  initWorker() {
    if (process.platform !== 'win32') return;
    try {
      const psScript = `
        $locks = @{}
        while ($line = [Console]::ReadLine()) {
          if (-not $line) { continue }
          $parts = $line.Split('|', 3)
          $cmd = $parts[0]
          if ($cmd -eq 'LOCK') {
            $id = $parts[1]
            $p = $parts[2]
            try {
              if ($locks.ContainsKey($id)) {
                try { $locks[$id].Close() } catch {}
                $locks.Remove($id)
              }
              $locks[$id] = [System.IO.File]::Open($p, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
              [Console]::WriteLine('OK_LOCKED|' + $id)
            } catch {
              [Console]::WriteLine('ERR_LOCK|' + $id + '|' + $_.Exception.Message)
            }
          } elseif ($cmd -eq 'UNLOCK') {
            $id = $parts[1]
            if ($locks.ContainsKey($id)) {
              try { $locks[$id].Close(); $locks.Remove($id) } catch {}
              [Console]::WriteLine('OK_UNLOCKED|' + $id)
            }
          } elseif ($cmd -eq 'UNLOCK_ALL') {
            foreach ($k in @($locks.Keys)) {
              try { $locks[$k].Close() } catch {}
            }
            $locks.Clear()
            [Console]::WriteLine('OK_UNLOCKED_ALL')
          } elseif ($cmd -eq 'EXIT') {
            break
          }
        }
      `;
      this.worker = spawn('powershell.exe', ['-NoProfile', '-Command', psScript], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      this.worker.on('exit', () => {
        this.worker = null;
      });
    } catch (err) {
      console.warn('FileLockManager note:', err);
    }
  }

  lock(filePath) {
    if (!filePath || process.platform !== 'win32') return null;
    try {
      if (!fs.existsSync(filePath)) return null;
      for (const [id, item] of this.lockedFiles.entries()) {
        if (item.filePath === filePath) return id;
      }
      const id = String(this.nextId++);
      this.lockedFiles.set(id, { filePath });
      if (!this.worker) this.initWorker();
      if (this.worker && this.worker.stdin && !this.worker.stdin.destroyed) {
        this.worker.stdin.write(`LOCK|${id}|${filePath}\n`);
      }
      return id;
    } catch (_) {
      return null;
    }
  }

  unlock(filePathOrId) {
    if (!filePathOrId || process.platform !== 'win32') return;
    try {
      let targetId = null;
      if (this.lockedFiles.has(filePathOrId)) {
        targetId = filePathOrId;
      } else {
        for (const [id, item] of this.lockedFiles.entries()) {
          if (item.filePath === filePathOrId) {
            targetId = id;
            break;
          }
        }
      }
      if (targetId && this.lockedFiles.has(targetId)) {
        this.lockedFiles.delete(targetId);
        if (this.worker && this.worker.stdin && !this.worker.stdin.destroyed) {
          this.worker.stdin.write(`UNLOCK|${targetId}\n`);
        }
      }
    } catch (_) {}
  }

  unlockAll() {
    try {
      this.lockedFiles.clear();
      if (this.worker && this.worker.stdin && !this.worker.stdin.destroyed) {
        this.worker.stdin.write(`UNLOCK_ALL\n`);
        this.worker.stdin.write(`EXIT\n`);
        this.worker.stdin.end();
      }
    } catch (_) {}
  }

  async runWithUnlockedFile(filePath, fn) {
    let matchedId = null;
    for (const [id, item] of this.lockedFiles.entries()) {
      if (item.filePath === filePath) {
        matchedId = id;
        break;
      }
    }
    if (matchedId && this.worker && this.worker.stdin && !this.worker.stdin.destroyed) {
      this.worker.stdin.write(`UNLOCK|${matchedId}\n`);
      await new Promise((r) => setTimeout(r, 60));
    }
    try {
      return await fn();
    } finally {
      if (matchedId && this.worker && this.worker.stdin && !this.worker.stdin.destroyed) {
        this.worker.stdin.write(`LOCK|${matchedId}|${filePath}\n`);
      }
    }
  }
}

const fileLockManager = new FileLockManager();

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

    fileLockManager.lock(filePath);

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
        fileLockManager.lock(filePath);
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

  // IPC file locking handlers
  ipcMain.handle('lock-file', (_event, { filePath }) => {
    return fileLockManager.lock(filePath);
  });

  ipcMain.handle('unlock-file', (_event, { filePath }) => {
    fileLockManager.unlock(filePath);
    return true;
  });

  ipcMain.handle('unlock-all-files', () => {
    fileLockManager.unlockAll();
    return true;
  });

  // Handle IPC direct file overwrite (no prompt under any circumstances)
  ipcMain.handle('save-file-direct', async (_event, { filePath, defaultName, buffer }) => {
    try {
      let targetPath = filePath;
      if (!targetPath) {
        const desktopDir = app.getPath('desktop');
        targetPath = path.join(desktopDir, defaultName || 'document.pdf');
      }
      return await fileLockManager.runWithUnlockedFile(targetPath, async () => {
        fs.writeFileSync(targetPath, Buffer.from(buffer));
        fileLockManager.lock(targetPath);
        return { success: true, filePath: targetPath };
      });
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
      return await fileLockManager.runWithUnlockedFile(filePath, async () => {
        fs.writeFileSync(filePath, Buffer.from(buffer));
        fileLockManager.lock(filePath);
        return { success: true, filePath };
      });
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
    fileLockManager.unlockAll();
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
  fileLockManager.unlockAll();
});

app.on('will-quit', () => {
  isQuitting = true;
  fileLockManager.unlockAll();
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

