import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

export default function ChatInput({ disabled, onSend }: Props) {
  const [value, setvalue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setvalue('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setvalue(e.target.value)}
        placeholder={
          disabled ? 'Local AI is busy…' : 'Type your message…'
        }
        disabled={disabled}
        className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-transparent transition disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-2.5 text-sm font-medium text-white transition-colors flex items-center gap-1.5"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
