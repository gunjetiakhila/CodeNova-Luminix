export interface FsResult {
  success: boolean;
  error?: string;
  resolved?: string;
  content?: string;
  results?: Array<{ path: string; name: string; isDir: boolean }>;
  items?: Array<{ name: string; isDir: boolean; path: string }>;
}

export interface SystemPaths {
  home: string;
  documents: string;
  downloads: string;
  desktop: string;
}

export interface LocalmindApi {
  isElectron: boolean;

  getTrustedFolders: () => Promise<string[]>;
  addTrustedFolder: () => Promise<{ canceled?: boolean; folder?: string }>;
  removeTrustedFolder: (folder: string) => Promise<boolean>;

  createFolder: (path: string) => Promise<FsResult>;
  createFile: (path: string, content: string) => Promise<FsResult>;
  readFile: (path: string) => Promise<FsResult>;
  renameFile: (oldPath: string, newName: string) => Promise<FsResult>;
  moveFile: (src: string, destDir: string) => Promise<FsResult>;
  copyFile: (src: string, destDir: string) => Promise<FsResult>;
  deleteFile: (path: string) => Promise<FsResult>;
  searchFiles: (dir: string, query: string) => Promise<FsResult>;
  openFile: (path: string) => Promise<FsResult>;
  openFolder: (path: string) => Promise<FsResult>;
  listFiles: (dir: string) => Promise<FsResult>;

  getSystemPaths: () => Promise<SystemPaths>;
}

declare global {
  interface Window {
    localmind?: LocalmindApi;
  }
}

export {};
