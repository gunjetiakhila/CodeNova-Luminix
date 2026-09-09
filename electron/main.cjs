const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: 'LocalMind',
    backgroundColor: '#0b1120',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Trusted Folders State ──────────────────────────────────────────────
const trustedFoldersPath = path.join(
  app ? app.getPath('userData') : '',
  'trusted-folders.json'
);

let trustedFolders = [];

async function loadTrustedFolders() {
  try {
    const data = await fsp.readFile(trustedFoldersPath, 'utf-8');
    trustedFolders = JSON.parse(data);
  } catch {
    trustedFolders = [];
  }
}

async function saveTrustedFolders() {
  await fsp.writeFile(
    trustedFoldersPath,
    JSON.stringify(trustedFolders, null, 2),
    'utf-8'
  );
}

// ─── Path Security ─────────────────────────────────────────────────────

function isPathTrusted(targetPath) {
  const resolved = path.resolve(targetPath);
  return trustedFolders.some((folder) => {
    const trustedResolved = path.resolve(folder);
    return (
      resolved === trustedResolved ||
      resolved.startsWith(trustedResolved + path.sep)
    );
  });
}

function validatePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'Invalid path.' };
  }

  // Reject null bytes
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Invalid characters in path.' };
  }

  // Resolve relative paths against home directory
  const home = app.getPath('home');
  let resolved;

  if (path.isAbsolute(inputPath)) {
    resolved = path.resolve(inputPath);
  } else {
    // Handle common folder name shortcuts
    const lower = inputPath.toLowerCase();
    const shortcuts = {
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      desktop: app.getPath('desktop'),
      pictures: app.getPath('pictures'),
      music: app.getPath('music'),
      videos: app.getPath('videos'),
      home: home,
    };

    const firstSegment = lower.split(/[/\\]/)[0];
    if (shortcuts[firstSegment]) {
      const rest = inputPath.slice(firstSegment.length).replace(/^[/\\]/, '');
      resolved = rest
        ? path.join(shortcuts[firstSegment], rest)
        : shortcuts[firstSegment];
    } else {
      resolved = path.join(home, inputPath);
    }
  }

  // Check if path is inside a trusted folder
  if (!isPathTrusted(resolved)) {
    return { valid: false, error: 'NOT_TRUSTED', resolved };
  }

  return { valid: true, resolved };
}

// ─── IPC Handlers ──────────────────────────────────────────────────────

// Trusted Folders
ipcMain.handle('trusted-folders:get', async () => {
  return trustedFolders;
});

ipcMain.handle('trusted-folders:add', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select a Trusted Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const folder = result.filePaths[0];
  if (!trustedFolders.includes(folder)) {
    trustedFolders.push(folder);
    await saveTrustedFolders();
  }
  return { folder };
});

ipcMain.handle('trusted-folders:remove', async (_event, folder) => {
  trustedFolders = trustedFolders.filter((f) => f !== folder);
  await saveTrustedFolders();
  return true;
});

// File Operations — each handler validates the path before touching the FS

ipcMain.handle('fs:createFolder', async (_event, folderPath) => {
  const check = validatePath(folderPath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    await fsp.mkdir(check.resolved, { recursive: false });
    return { success: true, resolved: check.resolved };
  } catch (err) {
    return {
      success: false,
      error:
        err.code === 'EEXIST'
          ? 'Folder already exists.'
          : err.code === 'EACCES'
          ? 'Access denied by the operating system.'
          : err.message,
    };
  }
});

ipcMain.handle('fs:createFile', async (_event, filePath, content) => {
  const check = validatePath(filePath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    await fsp.writeFile(check.resolved, content ?? '', 'utf-8');
    return { success: true, resolved: check.resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:readFile', async (_event, filePath) => {
  const check = validatePath(filePath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    const content = await fsp.readFile(check.resolved, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:renameFile', async (_event, oldPath, newName) => {
  const checkOld = validatePath(oldPath);
  if (!checkOld.valid) return { success: false, error: checkOld.error, resolved: checkOld.resolved };

  // newName must be just a filename, not a path
  const safeName = path.basename(newName);
  if (!safeName || safeName !== newName) {
    return { success: false, error: 'Invalid new name. Use a filename only.' };
  }

  const newPath = path.join(path.dirname(checkOld.resolved), safeName);
  if (!isPathTrusted(newPath)) {
    return { success: false, error: 'NOT_TRUSTED', resolved: newPath };
  }

  try {
    await fsp.rename(checkOld.resolved, newPath);
    return { success: true, resolved: newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:moveFile', async (_event, srcPath, destDir) => {
  const checkSrc = validatePath(srcPath);
  if (!checkSrc.valid) return { success: false, error: checkSrc.error, resolved: checkSrc.resolved };

  const checkDest = validatePath(destDir);
  if (!checkDest.valid) return { success: false, error: checkDest.error, resolved: checkDest.resolved };

  const fileName = path.basename(checkSrc.resolved);
  const destPath = path.join(checkDest.resolved, fileName);

  try {
    await fsp.rename(checkSrc.resolved, destPath);
    return { success: true, resolved: destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:copyFile', async (_event, srcPath, destDir) => {
  const checkSrc = validatePath(srcPath);
  if (!checkSrc.valid) return { success: false, error: checkSrc.error, resolved: checkSrc.resolved };

  const checkDest = validatePath(destDir);
  if (!checkDest.valid) return { success: false, error: checkDest.error, resolved: checkDest.resolved };

  const fileName = path.basename(checkSrc.resolved);
  const destPath = path.join(checkDest.resolved, fileName);

  try {
    await fsp.copyFile(checkSrc.resolved, destPath);
    return { success: true, resolved: destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:deleteFile', async (_event, filePath) => {
  const check = validatePath(filePath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    const stat = await fsp.stat(check.resolved);
    if (stat.isDirectory()) {
      await fsp.rmdir(check.resolved);
    } else {
      await fsp.unlink(check.resolved);
    }
    return { success: true, resolved: check.resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:searchFiles', async (_event, searchDir, query) => {
  const check = validatePath(searchDir);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };

  const results = [];
  const lowerQuery = query.toLowerCase();

  async function walk(dir, depth) {
    if (depth > 5) return;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({ path: fullPath, name: entry.name, isDir: entry.isDirectory() });
        if (results.length >= 50) return;
      }
      if (entry.isDirectory() && results.length < 50) {
        await walk(fullPath, depth + 1);
      }
    }
  }

  await walk(check.resolved, 0);
  return { success: true, results };
});

ipcMain.handle('fs:openFile', async (_event, filePath) => {
  const check = validatePath(filePath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    const error = await shell.openPath(check.resolved);
    return error
      ? { success: false, error }
      : { success: true, resolved: check.resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:openFolder', async (_event, folderPath) => {
  const check = validatePath(folderPath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    const error = await shell.openPath(check.resolved);
    return error
      ? { success: false, error }
      : { success: true, resolved: check.resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:listFiles', async (_event, dirPath) => {
  const check = validatePath(dirPath);
  if (!check.valid) return { success: false, error: check.error, resolved: check.resolved };
  try {
    const entries = await fsp.readdir(check.resolved, { withFileTypes: true });
    const items = entries.map((e) => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(check.resolved, e.name),
    }));
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// System paths
ipcMain.handle('system:getPaths', async () => {
  return {
    home: app.getPath('home'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
  };
});

// ─── App Lifecycle ─────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await loadTrustedFolders();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
