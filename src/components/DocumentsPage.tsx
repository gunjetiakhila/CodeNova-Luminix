import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Trash2,
  FolderOpen,
  Eye,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import DocStatusBadge from '@/components/DocStatusBadge';
import DocumentDetailModal from '@/components/DocumentDetailModal';
import { deleteDoc, getAllDocs } from '@/lib/docStore';
import type { DocRecord } from '@/types';

interface Props {
  isModelReady: boolean;
  isGenerating: boolean;
  onGenerate: (prompt: string, onToken: (chunk: string) => void) => Promise<string>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage({
  isModelReady,
  isGenerating,
  onGenerate,
}: Props) {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocs = useCallback(async () => {
    try {
      const all = await getAllDocs();
      setDocs(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const upsertDoc = useCallback((doc: DocRecord) => {
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next.sort((a, b) => b.dateAdded - a.dateAdded);
      }
      return [doc, ...prev].sort((a, b) => b.dateAdded - a.dateAdded);
    });
    setSelectedDoc((prev) => (prev && prev.id === doc.id ? doc : prev));
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const handleDocAdded = useCallback(
    (doc: DocRecord) => {
      upsertDoc(doc);
    },
    [upsertDoc]
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Documents processed locally · Never uploaded
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your Documents
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Upload PDF or text files and ask the on-device AI about them. All text
          extraction happens in your browser.
        </p>
      </div>

      <div className="mb-6">
        <DocumentUpload onDocAdded={handleDocAdded} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/40 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 border-b border-slate-800/80 px-5 py-3">
          <FolderOpen className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
              <FileText className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm text-slate-400">No documents yet</p>
            <p className="mt-1 text-xs text-slate-600">
              Upload a PDF or TXT file to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Size</th>
                  <th className="px-3 py-3 font-medium">Added</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-800/40 transition-colors last:border-0 hover:bg-slate-800/30"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700/40 text-slate-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="max-w-[200px] truncate font-medium text-slate-200">
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-slate-700/40 px-2 py-0.5 text-xs uppercase text-slate-400">
                        {doc.fileType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {formatSize(doc.fileSize)}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {formatDate(doc.dateAdded)}
                    </td>
                    <td className="px-3 py-3">
                      <DocStatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          disabled={doc.status !== 'ready'}
                          title="Open"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          disabled={doc.status !== 'ready'}
                          title="Summarize"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          disabled={doc.status !== 'ready'}
                          title="Ask AI"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <span className="text-xs font-medium">Ask AI</span>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Delete"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          isModelReady={isModelReady}
          isGenerating={isGenerating}
          onClose={() => setSelectedDoc(null)}
          onGenerate={onGenerate}
        />
      )}
    </div>
  );
}
