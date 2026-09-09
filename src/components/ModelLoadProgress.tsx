interface Props {
  progress: number;
  text: string;
}

export default function ModelLoadProgress({ progress, text }: Props) {
  return (
    <div className="w-full max-w-md mx-auto py-12 px-6 text-center">
      <div className="inline-flex items-center gap-2 text-sky-300 mb-6">
        <svg
          className="h-5 w-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm font-medium">Preparing local model…</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-400 truncate">{progress}% — {text}</p>
    </div>
  );
}
