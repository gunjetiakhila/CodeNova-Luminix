import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import type { ModelStatus } from '@/types';

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export function useWebLLM() {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const engineRef = useRef<MLCEngine | null>(null);
  const initStartedRef = useRef(false);

  const initialize = useCallback(async () => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    setStatus('initializing');
    setError(null);
    setProgress(0);

    try {
      const mod = await import('@mlc-ai/web-llm');
      const createEngine: typeof CreateMLCEngine = mod.CreateMLCEngine;

      const onProgress = (report: InitProgressReport) => {
        const pct = Math.round((report.progress ?? 0) * 100);
        setProgress(pct);
        setProgressText(report.text ?? '');
        if (report.progress < 1) {
          setStatus((prev) => (prev === 'initializing' ? 'downloading' : prev));
        }
      };

      setStatus('loading');
      const engine = await createEngine(MODEL_ID, {
        initProgressCallback: onProgress,
      });

      engineRef.current = engine;
      setStatus('ready');
      setProgress(100);
    } catch (err) {
      initStartedRef.current = false;
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'Failed to initialize local model.'
      );
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const generate = useCallback(
    async (
      messages: { role: 'user' | 'assistant'; content: string }[],
      onToken: (chunk: string) => void
    ): Promise<string> => {
      if (!engineRef.current) throw new Error('Engine not ready');
      setIsGenerating(true);

      try {
        const stream = await engineRef.current.chat.completions.create({
          messages,
          stream: true,
          temperature: 0.7,
        });

        let full = '';
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            onToken(delta);
          }
        }
        return full;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const retry = useCallback(() => {
    initStartedRef.current = false;
    engineRef.current = null;
    initialize();
  }, [initialize]);

  return {
    status,
    progress,
    progressText,
    error,
    isGenerating,
    generate,
    retry,
  };
}
