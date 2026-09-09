import { useEffect, useState } from 'react';
import { FolderPlus, Trash2, Folder, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import {
  getTrustedFolders,
  addTrustedFolder,
  removeTrustedFolder,
  isElectron,
} from '@/lib/ipcClient';

export default function TrustedFoldersPage() {
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const electronAvailable = isElectron();

  const load = async () => {
    try {
      const f = await getTrustedFolders();
      setFolders(f);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const result = await addTrustedFolder();
      if (!result.canceled && result.folder) {
        setFolders((prev) =>
          prev.includes(result.folder!) ? prev : [...prev, result.folder!]
        );
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (folder: string) => {
    await removeTrustedFolder(folder);
    setFolders((prev) => prev.filter((f) => f !== folder));
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Filesystem access restricted to trusted folders
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Trusted Folders
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          The assistant can only access folders you explicitly trust. Add or
          remove folders here.
        </p>
      </div>

      {!electronAvailable && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <ShieldOff className="h-4 w-4 flex-shrink-0" />
          Running in browser mode. Device actions require the desktop app.
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={handleAdd}
          disabled={!electronAvailable || adding}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderPlus className="h-4 w-4" />
          )}
          Add Trusted Folder
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
            <Folder className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-slate-400">No trusted folders yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Add a folder to allow the assistant to access it
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folder) => (
            <div
              key={folder}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Folder className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">
                  {folder}
                </p>
                <p className="text-xs text-slate-500">Trusted</p>
              </div>
              <button
                onClick={() => handleRemove(folder)}
                title="Remove"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
