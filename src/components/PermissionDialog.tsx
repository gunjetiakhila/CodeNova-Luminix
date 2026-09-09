import { ShieldAlert, Trash2, Check, X, ShieldCheck } from 'lucide-react';
import type { StructuredCommand } from '@/types';
import { isDestructive, describeCommand } from '@/lib/commandRouter';

interface Props {
  command: StructuredCommand;
  onAllow: () => void;
  onDeny: () => void;
}

export default function PermissionDialog({ command, onAllow, onDeny }: Props) {
  const destructive = isDestructive(command.intent);
  const description = describeCommand(command);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 ${destructive ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${destructive ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {destructive ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {destructive ? 'Confirmation Required' : 'Permission Required'}
            </h2>
            <p className="text-xs text-slate-500">
              {destructive ? 'This is a destructive operation' : 'The assistant wants to perform an action'}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-slate-300">
            {destructive
              ? `The assistant wants to permanently delete:`
              : `The assistant wants to:`}
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-3">
            <p className="text-sm font-medium text-slate-200">
              {destructive ? command.path : description}
            </p>
          </div>

          {destructive && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
              This action cannot be undone.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            onClick={onDeny}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
            {destructive ? 'Cancel' : 'Deny'}
          </button>
          <button
            onClick={onAllow}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-sky-600 hover:bg-sky-500'
            }`}
          >
            <Check className="h-4 w-4" />
            {destructive ? 'Delete' : 'Allow'}
          </button>
        </div>
      </div>
    </div>
  );
}
