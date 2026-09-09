import type { FsResult, SystemPaths } from '@/electron';

function getApi() {
  return typeof window !== 'undefined' ? window.localmind : undefined;
}

export function isElectron(): boolean {
  return !!getApi()?.isElectron;
}

export async function getTrustedFolders(): Promise<string[]> {
  const api = getApi();
  if (!api) return [];
  return api.getTrustedFolders();
}

export async function addTrustedFolder(): Promise<{
  canceled?: boolean;
  folder?: string;
}> {
  const api = getApi();
  if (!api) return { canceled: true };
  return api.addTrustedFolder();
}

export async function removeTrustedFolder(folder: string): Promise<boolean> {
  const api = getApi();
  if (!api) return false;
  return api.removeTrustedFolder(folder);
}

export async function createFolder(path: string): Promise<FsResult> {
  return getApi()?.createFolder(path) ?? { success: false, error: 'Not in Electron' };
}

export async function createFile(path: string, content: string): Promise<FsResult> {
  return getApi()?.createFile(path, content) ?? { success: false, error: 'Not in Electron' };
}

export async function readFile(path: string): Promise<FsResult> {
  return getApi()?.readFile(path) ?? { success: false, error: 'Not in Electron' };
}

export async function renameFile(oldPath: string, newName: string): Promise<FsResult> {
  return getApi()?.renameFile(oldPath, newName) ?? { success: false, error: 'Not in Electron' };
}

export async function moveFile(src: string, destDir: string): Promise<FsResult> {
  return getApi()?.moveFile(src, destDir) ?? { success: false, error: 'Not in Electron' };
}

export async function copyFile(src: string, destDir: string): Promise<FsResult> {
  return getApi()?.copyFile(src, destDir) ?? { success: false, error: 'Not in Electron' };
}

export async function deleteFile(path: string): Promise<FsResult> {
  return getApi()?.deleteFile(path) ?? { success: false, error: 'Not in Electron' };
}

export async function searchFiles(dir: string, query: string): Promise<FsResult> {
  return getApi()?.searchFiles(dir, query) ?? { success: false, error: 'Not in Electron' };
}

export async function openFile(path: string): Promise<FsResult> {
  return getApi()?.openFile(path) ?? { success: false, error: 'Not in Electron' };
}

export async function openFolder(path: string): Promise<FsResult> {
  return getApi()?.openFolder(path) ?? { success: false, error: 'Not in Electron' };
}

export async function getSystemPaths(): Promise<SystemPaths | null> {
  return (await getApi()?.getSystemPaths()) ?? null;
}
