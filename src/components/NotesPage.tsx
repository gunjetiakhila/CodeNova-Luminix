import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  ListChecks,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { deleteNote, getAllNotes, putNote } from '@/lib/noteStore';
import { buildNotePrompt, NOTE_ACTION_LABELS } from '@/lib/notePrompts';
import type { NoteActionType, NoteRecord } from '@/types';

interface Props {
  isModelReady: boolean;
  isGenerating: boolean;
  onGenerate: (prompt: string, onToken: (chunk: string) => void) => Promise<string>;
}

const QUICK_ACTIONS: { type: NoteActionType; icon: typeof Sparkles }[] = [
  { type: 'summarize', icon: Sparkles },
  { type: 'rewrite', icon: RefreshCw },
  { type: 'bullet-points', icon: ListChecks },
  { type: 'explain', icon: BookOpen },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotesPage({ isModelReady, isGenerating, onGenerate }: Props) {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState('');
  const [aiNoteId, setAiNoteId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const all = await getAllNotes();
      setNotes(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const sortedNotes = useMemo(() => {
    const filtered = notes.filter((n) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    });
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, search]);

  const openNewEditor = () => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setShowEditor(true);
  };

  const openEditEditor = (note: NoteRecord) => {
    setEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setShowEditor(true);
  };

  const saveNote = async () => {
    const title = editorTitle.trim() || 'Untitled';
    const content = editorContent.trim();
    if (!title && !content) {
      setShowEditor(false);
      return;
    }
    const now = Date.now();
    if (editingNote) {
      const updated: NoteRecord = {
        ...editingNote,
        title,
        content,
        updatedAt: now,
      };
      await putNote(updated);
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
    } else {
      const note: NoteRecord = {
        id: crypto.randomUUID(),
        title,
        content,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      await putNote(note);
      setNotes((prev) => [...prev, note]);
    }
    setShowEditor(false);
    setEditingNote(null);
  };

  const togglePin = async (note: NoteRecord) => {
    const updated = { ...note, pinned: !note.pinned };
    await putNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (aiNoteId === id) {
      setAiNoteId(null);
      setAiOutput('');
      setActiveAction(null);
    }
  };

  const runAiAction = async (action: NoteActionType, note: NoteRecord) => {
    if (!isModelReady || isGenerating) return;
    setActiveAction(action);
    setAiNoteId(note.id);
    setAiOutput('');
    const prompt = buildNotePrompt(action, note.title, note.content);
    try {
      await onGenerate(prompt, (chunk) => {
        setAiOutput((prev) => prev + chunk);
      });
    } catch {
      setAiOutput('Failed to generate a response. Please try again.');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Notes stored locally · AI actions run on-device
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Notes
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Create, search, and pin notes. Use the local AI to summarize, rewrite,
          or explain them.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
        <button
          onClick={openNewEditor}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
            <Pencil className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {search ? 'No notes match your search' : 'No notes yet'}
          </p>
          {!search && (
            <p className="mt-1 text-xs text-slate-600">
              Click "New Note" to create one
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`flex flex-col rounded-xl border p-4 transition-colors ${
                note.pinned
                  ? 'border-sky-500/30 bg-sky-500/5'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100 line-clamp-1">
                  {note.title || 'Untitled'}
                </h3>
                <button
                  onClick={() => togglePin(note)}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                  className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
                    note.pinned
                      ? 'text-sky-400 hover:bg-sky-500/10'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  {note.pinned ? (
                    <Pin className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <PinOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="mb-3 flex-1 text-xs leading-relaxed text-slate-400 line-clamp-4 whitespace-pre-wrap">
                {note.content || 'No content'}
              </p>
              <p className="mb-3 text-[11px] text-slate-600">
                Updated {formatDate(note.updatedAt)}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => runAiAction(type, note)}
                    disabled={!isModelReady || isGenerating}
                    title={NOTE_ACTION_LABELS[type]}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-sky-500/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon className="h-3 w-3" />
                    {NOTE_ACTION_LABELS[type]}
                  </button>
                ))}
              </div>

              {aiNoteId === note.id && (aiOutput || (activeAction && isGenerating)) && (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-sky-300">
                    <Sparkles className="h-3 w-3" />
                    {activeAction
                      ? NOTE_ACTION_LABELS[activeAction as NoteActionType]
                      : 'Result'}
                  </div>
                  {isGenerating && !aiOutput ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                      Thinking locally…
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                      {aiOutput}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1 border-t border-slate-800/60 pt-2">
                <button
                  onClick={() => openEditEditor(note)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
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
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="Title"
                autoFocus
                className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Write your note…"
                rows={8}
                className="flex-1 resize-none rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                onClick={saveNote}
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
