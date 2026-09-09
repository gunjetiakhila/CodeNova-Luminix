const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('localmind', {
  // Trusted folders
  getTrustedFolders: () => ipcRenderer.invoke('trusted-folders:get'),
  addTrustedFolder: () => ipcRenderer.invoke('trusted-folders:add'),
  removeTrustedFolder: (folder) => ipcRenderer.invoke('trusted-folders:remove', folder),

  // File operations — specific, allowlisted APIs only
  createFolder: (path) => ipcRenderer.invoke('fs:createFolder', path),
  createFile: (path, content) => ipcRenderer.invoke('fs:createFile', path, content),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  renameFile: (oldPath, newName) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  moveFile: (src, destDir) => ipcRenderer.invoke('fs:moveFile', src, destDir),
  copyFile: (src, destDir) => ipcRenderer.invoke('fs:copyFile', src, destDir),
  deleteFile: (path) => ipcRenderer.invoke('fs:deleteFile', path),
  searchFiles: (dir, query) => ipcRenderer.invoke('fs:searchFiles', dir, query),
  openFile: (path) => ipcRenderer.invoke('fs:openFile', path),
  openFolder: (path) => ipcRenderer.invoke('fs:openFolder', path),
  listFiles: (dir) => ipcRenderer.invoke('fs:listFiles', dir),

  // System
  getSystemPaths: () => ipcRenderer.invoke('system:getPaths'),

  isElectron: true,
});
