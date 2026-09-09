import { useCallback, useEffect, useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Search,
  Pencil,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  getAllMemories,
  saveMemory,
  deleteMemory,
  updateMemory,
  searchMemories,
} from '@/lib/memoryStore';
import type { MemoryRecord } from '@/types';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);
  const [content, setContent] = useState('');

  const load = useCallback(async () => {
    try {
      if (search.trim()) {
        const results = await searchMemories(search);
        setMemories(results);
      } else {
        const all = await getAllMemories();
        setMemories(all);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditingMemory(null);
    setContent('');
    setShowEditor(true);
  };

  const openEdit = (memory: MemoryRecord) => {
    setEditingMemory(memory);
    setContent(memory.content);
    setShowEditor(true);
  };

  const handleSave = async () => {
    const text = content.trim();
    if (!text) {
      setShowEditor(false);
      return;
    }
    if (editingMemory) {
      await updateMemory(editingMemory.id, text);
    } else {
      await saveMemory(text);
    }
    setShowEditor(false);
    setEditingMemory(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Memories stored locally · Never leave your device
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Memory
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Save things for the assistant to remember. Ask "What am I learning?"
          and it will retrieve the stored memory.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories…"
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          New Memory
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
            <Brain className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {search ? 'No memories match your search' : 'No memories yet'}
          </p>
          {!search && (
            <p className="mt-1 text-xs text-slate-600">
              Save something for the assistant to remember
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                <Brain className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {memory.content}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  {formatDate(memory.createdAt)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(memory)}
                  title="Edit"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(memory.id)}
                  title="Delete"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-100">
                {editingMemory ? 'Edit Memory' : 'New Memory'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What should the assistant remember?"
                rows={5}
                autoFocus
                className="w-full resize-none rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
