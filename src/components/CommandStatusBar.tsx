import {
  Brain,
  Check,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { CommandStatus } from '@/types';

interface Props {
  status: CommandStatus;
}

const STAGE_CONFIG: Record<
  CommandStatus['stage'],
  { label: string; icon: typeof Check; color: string }
> = {
  understanding: {
    label: 'Understanding…',
    icon: Brain,
    color: 'text-sky-400',
  },
  awaiting_permission: {
    label: 'Permission required',
    icon: ShieldAlert,
    color: 'text-amber-400',
  },
  permission_granted: {
    label: 'Permission granted',
    icon: Check,
    color: 'text-emerald-400',
  },
  executing: {
    label: 'Executing…',
    icon: Loader2,
    color: 'text-sky-400',
  },
  completed: {
    label: 'Completed',
    icon: Check,
    color: 'text-emerald-400',
  },
  denied: {
    label: 'Permission denied',
    icon: X,
    color: 'text-slate-500',
  },
  error: {
    label: 'Error',
    icon: X,
    color: 'text-red-400',
  },
};

export default function CommandStatusBar({ status }: Props) {
  const cfg = STAGE_CONFIG[status.stage];
  const Icon = cfg.icon;
  const spin = status.stage === 'understanding' || status.stage === 'executing';

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <Icon className={`h-4 w-4 ${cfg.color} ${spin ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${cfg.color}`}>
          {cfg.label}
        </p>
        {status.targetPath && (
          <p className="truncate text-[11px] text-slate-500">
            {status.targetPath}
          </p>
        )}
        {status.result && status.stage === 'completed' && (
          <p className="truncate text-[11px] text-slate-400">
            {status.result}
          </p>
        )}
        {status.result && status.stage === 'error' && (
          <p className="truncate text-[11px] text-red-400">
            {status.result}
          </p>
        )}
      </div>
      {status.stage === 'completed' && (
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
