import { useEffect, useRef, useState } from 'react';
import {
  X,
  FileText,
  Loader2,
  Sparkles,
  ListChecks,
  BookOpen,
  HelpCircle,
  Send,
} from 'lucide-react';
import DocStatusBadge from '@/components/DocStatusBadge';
import { ACTION_LABELS, buildDocPrompt, buildAskPrompt } from '@/lib/docPrompts';
import type { DocActionType, DocRecord } from '@/types';

interface Props {
  doc: DocRecord;
  isModelReady: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, onToken: (chunk: string) => void) => Promise<string>;
}

type QuickAction = Exclude<DocActionType, 'ask-ai'>;

const QUICK_ACTIONS: { type: QuickAction; icon: typeof Sparkles }[] = [
  { type: 'summarize', icon: Sparkles },
  { type: 'key-points', icon: ListChecks },
  { type: 'explain-simply', icon: BookOpen },
  { type: 'generate-questions', icon: HelpCircle },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function DocumentDetailModal({
  doc,
  isModelReady,
  isGenerating,
  onClose,
  onGenerate,
}: Props) {
  const [output, setOutput] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [askInput, setAskInput] = useState('');
  const [askOutput, setAskOutput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [output, askOutput]);

  const runAction = async (action: QuickAction) => {
    if (!isModelReady || isGenerating) return;
    setActiveAction(action);
    setOutput('');
    const prompt = buildDocPrompt(action, doc.text);
    try {
      await onGenerate(prompt, (chunk) => {
        setOutput((prev) => prev + chunk);
      });
    } catch {
      setOutput('Failed to generate a response. Please try again.');
    } finally {
      setActiveAction(null);
    }
  };

  const runAsk = async () => {
    const q = askInput.trim();
    if (!q || !isModelReady || isGenerating) return;
    setActiveAction('ask-ai');
    setAskOutput('');
    const prompt = buildAskPrompt(q, doc.text);
    try {
      await onGenerate(prompt, (chunk) => {
        setAskOutput((prev) => prev + chunk);
      });
    } catch {
      setAskOutput('Failed to generate a response. Please try again.');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-start gap-3 pr-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-100">
                {doc.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="uppercase">{doc.fileType}</span>
                <span>·</span>
                <span>{formatSize(doc.fileSize)}</span>
                <span>·</span>
                <span>{formatDate(doc.dateAdded)}</span>
                <span>·</span>
                <DocStatusBadge status={doc.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" ref={scrollRef}>
          {doc.status === 'error' ? (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {doc.error ?? 'This document could not be processed.'}
            </div>
          ) : doc.status === 'processing' ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              Processing document locally…
            </div>
          ) : (
            <>
              {doc.text && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Extracted Text Preview
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-xs leading-relaxed text-slate-400">
                    {doc.text.slice(0, 800)}
                    {doc.text.length > 800 && '…'}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Document processed locally
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  AI Actions
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_ACTIONS.map(({ type, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => runAction(type)}
                      disabled={!isModelReady || isGenerating}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-3 text-xs font-medium text-slate-300 transition-colors hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon className="h-4 w-4" />
                      {ACTION_LABELS[type]}
                    </button>
                  ))}
                </div>
                {!isModelReady && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    The local AI model must be ready before using AI actions.
                  </p>
                )}

                {(output || (activeAction && activeAction !== 'ask-ai' && isGenerating)) && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-800/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sky-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {activeAction ? ACTION_LABELS[activeAction as QuickAction] : 'Result'}
                    </div>
                    {isGenerating && !output ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                        Thinking locally…
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {output}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ask AI About This Document
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={askInput}
                    onChange={(e) => setAskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        runAsk();
                      }
                    }}
                    placeholder="Ask a question about this document…"
                    disabled={!isModelReady || isGenerating}
                    className="flex-1 rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50"
                  />
                  <button
                    onClick={runAsk}
                    disabled={!isModelReady || isGenerating || !askInput.trim()}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {(askOutput || (activeAction === 'ask-ai' && isGenerating)) && (
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-800/40 p-4">
                    {isGenerating && !askOutput ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                        Thinking locally…
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {askOutput}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
