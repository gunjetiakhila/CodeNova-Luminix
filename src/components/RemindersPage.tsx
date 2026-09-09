import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Bell,
  Check,
  Loader2,
  ShieldCheck,
  Calendar,
  Clock,
} from 'lucide-react';
import {
  deleteReminder,
  getAllReminders,
  putReminder,
} from '@/lib/noteStore';
import type { ReminderRecord } from '@/types';

function isOverdue(reminder: ReminderRecord): boolean {
  if (reminder.completed || !reminder.date) return false;
  const d = new Date(`${reminder.date}T${reminder.time || '23:59'}`);
  return d.getTime() < Date.now();
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      const all = await getAllReminders();
      setReminders(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const da = new Date(`${a.date || '9999'}T${a.time || '00:00'}`).getTime();
      const db = new Date(`${b.date || '9999'}T${b.time || '00:00'}`).getTime();
      return da - db;
    });
  }, [reminders]);

  const openNew = () => {
    setEditingReminder(null);
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setShowEditor(true);
  };

  const openEdit = (reminder: ReminderRecord) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setDescription(reminder.description);
    setDate(reminder.date);
    setTime(reminder.time);
    setShowEditor(true);
  };

  const saveReminder = async () => {
    const t = title.trim();
    if (!t) return;
    if (editingReminder) {
      const updated: ReminderRecord = {
        ...editingReminder,
        title: t,
        description: description.trim(),
        date,
        time,
      };
      await putReminder(updated);
      setReminders((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } else {
      const reminder: ReminderRecord = {
        id: crypto.randomUUID(),
        title: t,
        description: description.trim(),
        date,
        time,
        completed: false,
        createdAt: Date.now(),
      };
      await putReminder(reminder);
      setReminders((prev) => [...prev, reminder]);
    }
    setShowEditor(false);
    setEditingReminder(null);
  };

  const toggleComplete = async (reminder: ReminderRecord) => {
    const updated = { ...reminder, completed: !reminder.completed };
    await putReminder(updated);
    setReminders((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Reminders stored locally on your device
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Reminders
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Create reminders with a date and time. Mark them complete when done.
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          New Reminder
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : sortedReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 text-slate-600">
            <Bell className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-slate-400">No reminders yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Click "New Reminder" to create one
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedReminders.map((reminder) => {
            const overdue = isOverdue(reminder);
            return (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                  reminder.completed
                    ? 'border-slate-800/50 bg-slate-900/20'
                    : overdue
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <button
                  onClick={() => toggleComplete(reminder)}
                  className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    reminder.completed
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-600 hover:border-sky-500'
                  }`}
                >
                  {reminder.completed && <Check className="h-3.5 w-3.5" />}
                </button>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-sm font-medium line-clamp-1 ${
                      reminder.completed
                        ? 'text-slate-500 line-through'
                        : 'text-slate-100'
                    }`}
                  >
                    {reminder.title}
                  </h3>
                  {reminder.description && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                      {reminder.description}
                    </p>
                  )}
                  {(reminder.date || reminder.time) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      {reminder.date && (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {reminder.date}
                        </span>
                      )}
                      {reminder.time && (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          {reminder.time}
                        </span>
                      )}
                      {overdue && (
                        <span className="text-red-400 font-medium">Overdue</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(reminder)}
                    title="Edit"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    title="Delete"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. Study DBMS)"
                autoFocus
                className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (e.g. tomorrow at 7 PM)"
                rows={3}
                className="resize-none rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveReminder}
                disabled={!title.trim()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
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
