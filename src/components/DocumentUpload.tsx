import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { extractText, getFileType } from '@/lib/pdfExtract';
import { putDoc } from '@/lib/docStore';
import type { DocRecord } from '@/types';

interface Props {
  onDocAdded: (doc: DocRecord) => void;
}

export default function DocumentUpload({ onDocAdded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processName, setProcessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const type = getFileType(file.name);
      if (!type) {
        setError('Only PDF and TXT files are supported.');
        return;
      }

      setError(null);
      setIsProcessing(true);
      setProcessName(file.name);

      const doc: DocRecord = {
        id: crypto.randomUUID(),
        name: file.name,
        fileType: type,
        fileSize: file.size,
        dateAdded: Date.now(),
        status: 'processing',
        text: '',
      };

      await putDoc(doc);
      onDocAdded(doc);

      try {
        const text = await extractText(file);
        if (!text.trim()) {
          throw new Error('No text could be extracted from this file.');
        }
        const updated: DocRecord = { ...doc, text, status: 'ready' };
        await putDoc(updated);
        onDocAdded(updated);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : 'Failed to process document.';
        const updated: DocRecord = {
          ...doc,
          status: 'error',
          error: errMsg,
        };
        await putDoc(updated);
        onDocAdded(updated);
      } finally {
        setIsProcessing(false);
        setProcessName('');
      }
    },
    [onDocAdded]
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const file = files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
          isDragging
            ? 'border-sky-500 bg-sky-500/5'
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {isProcessing ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-sky-400" />
            <p className="mt-3 text-sm text-slate-300">Processing {processName}…</p>
            <p className="mt-1 text-xs text-slate-500">
              Extracting text locally in your browser
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-200">
              Upload a document
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Drag and drop or click to browse · PDF, TXT
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        <FileText className="h-3 w-3" />
        Documents are processed locally and never uploaded to a server.
      </div>
    </div>
  );
}
