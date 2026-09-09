import type { DocStatus } from '@/types';

const CONFIG: Record<DocStatus, { label: string; className: string; dot: string }> = {
  processing: {
    label: 'Processing',
    className: 'text-amber-300 bg-amber-500/10',
    dot: 'bg-amber-400 animate-pulse',
  },
  ready: {
    label: 'Ready',
    className: 'text-emerald-300 bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
  error: {
    label: 'Error',
    className: 'text-red-300 bg-red-500/10',
    dot: 'bg-red-400',
  },
};

interface Props {
  status: DocStatus;
}

export default function DocStatusBadge({ status }: Props) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
