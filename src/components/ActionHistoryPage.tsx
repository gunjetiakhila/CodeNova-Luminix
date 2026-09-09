import { useEffect, useState } from 'react';
import { History, Trash2, Check, X, Loader2, Clock } from 'lucide-react';
import {
  getActionHistory,
  clearActionHistory,
} from '@/lib/actionHistory';
import type { ActionHistoryEntry } from '@/types';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function intentLabel(intent: string): string {
  return intent
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ActionHistoryPage() {
  const [entries, setEntries] = useState<ActionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const h = await getActionHistory();
      setEntries(h);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleClear = async () => {
    await clearActionHistory();
    setEntries([]);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <History className="h-3.5 w-3.5 text-sky-400" />
          All actions recorded locally
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Action History
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          A log of every device action the assistant has requested and its
          outcome.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
            <Clock className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-slate-400">No actions recorded yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Actions will appear here once you start using ACT mode
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </button>
          </div>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
                  {entry.allowed ? (
                    entry.success ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                        <X className="h-4 w-4" />
                      </div>
                    )
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700/40 text-slate-500">
                      <X className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {intentLabel(entry.intent)}
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {entry.target}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span
                      className={
                        entry.allowed
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }
                    >
                      {entry.allowed ? 'Allowed' : 'Denied'}
                    </span>
                    {entry.allowed && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span
                          className={
                            entry.success
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }
                        >
                          {entry.success ? 'Success' : 'Failed'}
                        </span>
                      </>
                    )}
                    {entry.error && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-red-400 truncate">
                          {entry.error}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
