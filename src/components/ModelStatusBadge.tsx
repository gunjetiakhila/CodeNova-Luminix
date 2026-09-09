import type { ModelStatus } from '@/types';

const STATUS_CONFIG: Record<
  ModelStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  idle: {
    label: 'Idle',
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    bg: 'bg-slate-800/60',
  },
  initializing: {
    label: 'Initializing',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
  },
  downloading: {
    label: 'Downloading Model',
    dot: 'bg-sky-400 animate-pulse',
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
  },
  loading: {
    label: 'Loading Model',
    dot: 'bg-indigo-400 animate-pulse',
    text: 'text-indigo-300',
    bg: 'bg-indigo-500/10',
  },
  ready: {
    label: '🟢 Local AI Ready',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
  },
  error: {
    label: 'Error',
    dot: 'bg-red-400',
    text: 'text-red-300',
    bg: 'bg-red-500/10',
  },
};

interface Props {
  status: ModelStatus;
}

export default function ModelStatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}
