import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  ShieldCheck,
  Sparkles,
  User,
  Cpu,
} from 'lucide-react';

interface Props {
  isModelReady: boolean;
  onGenerate: (prompt: string, onToken: (chunk: string) => void) => Promise<string>;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceState = 'ready' | 'listening' | 'processing' | 'speaking';

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STATE_CONFIG: Record<VoiceState, { label: string; color: string; ring: string }> = {
  ready: {
    label: 'Ready',
    color: 'text-slate-300',
    ring: 'border-slate-600',
  },
  listening: {
    label: 'Listening',
    color: 'text-amber-300',
    ring: 'border-amber-400',
  },
  processing: {
    label: 'Processing Locally',
    color: 'text-sky-300',
    ring: 'border-sky-400',
  },
  speaking: {
    label: 'Speaking',
    color: 'text-emerald-300',
    ring: 'border-emerald-400',
  },
};

export default function VoiceAssistantPage({ isModelReady, onGenerate }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>('ready');
  const [recognizedText, setRecognizedText] = useState('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const interimRef = useRef('');

  const speechRecognitionSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const speechSynthesisSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, voiceState]);

  const stopSpeaking = useCallback(() => {
    if (speechSynthesisSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setVoiceState('ready');
  }, [speechSynthesisSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!speechSynthesisSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setVoiceState('speaking');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setVoiceState('ready');
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setVoiceState('ready');
      };
      window.speechSynthesis.speak(utterance);
    },
    [speechSynthesisSupported]
  );

  const handleResult = useCallback(
    async (finalText: string) => {
      setRecognizedText(finalText);
      setVoiceState('processing');
      const userMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: finalText,
        timestamp: Date.now(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: VoiceMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        let full = '';
        await onGenerate(finalText, (chunk) => {
          full += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        });
        setVoiceState('ready');
        if (full.trim()) {
          speak(full);
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'I couldn’t generate a local response. Please try again.' }
              : m
          )
        );
        setVoiceState('ready');
      }
    },
    [onGenerate, speak]
  );

  const startListening = useCallback(() => {
    if (!speechRecognitionSupported || !isModelReady) return;
    setError(null);
    setRecognizedText('');
    interimRef.current = '';

    const voiceWindow = window as VoiceWindow;
    const SpeechRecognitionClass =
      voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setError('Voice input is not supported by this browser.');
      return;
    }
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        interimRef.current = interim;
        setRecognizedText(interim);
      }
      if (final) {
        interimRef.current = '';
        recognitionRef.current = null;
        handleResult(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'no-speech') {
        setError('No speech was detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow it to use voice input.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setVoiceState('ready');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (voiceState === 'listening') {
        setVoiceState('ready');
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechRecognitionSupported, isModelReady, handleResult, voiceState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState('ready');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechSynthesisSupported]);

  const cfg = STATE_CONFIG[voiceState];
  const isListening = voiceState === 'listening';

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Voice processed locally · No cloud speech API
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Voice Assistant
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Talk to your on-device AI assistant. Speech recognition and AI
          inference run entirely in your browser.
        </p>
      </div>

      {!speechRecognitionSupported ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/90 bg-slate-900/40 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <MicOff className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-slate-300">
            Voice input is not supported by this browser.
          </p>
          <p className="mt-2 max-w-sm text-xs text-slate-500">
            Try using Chrome, Edge, or another Chromium-based browser for speech
            recognition support.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center rounded-2xl border border-slate-800/90 bg-slate-900/40 px-6 py-10 shadow-xl shadow-black/20">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isModelReady || voiceState === 'processing' || voiceState === 'speaking'}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                isListening
                  ? 'border-amber-400 bg-amber-500/10 scale-105'
                  : voiceState === 'processing'
                  ? 'border-sky-400 bg-sky-500/10'
                  : voiceState === 'speaking'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-600 bg-slate-800/40 hover:border-sky-500 hover:bg-sky-500/5'
              }`}
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                  <span className="absolute -inset-2 animate-pulse rounded-full border-2 border-amber-400/30" />
                </>
              )}
              {voiceState === 'processing' ? (
                <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="h-10 w-10 text-emerald-400" />
              ) : isListening ? (
                <MicOff className="h-10 w-10 text-amber-400" />
              ) : (
                <Mic className="h-10 w-10 text-slate-300" />
              )}
            </button>

            <p className="mt-6 text-lg font-medium text-slate-200">
              {isListening ? 'Listening…' : 'Talk to your assistant'}
            </p>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cfg.color} bg-slate-800/60`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                voiceState === 'ready' ? 'bg-slate-400' :
                voiceState === 'listening' ? 'bg-amber-400 animate-pulse' :
                voiceState === 'processing' ? 'bg-sky-400 animate-pulse' :
                'bg-emerald-400 animate-pulse'
              }`} />
              {cfg.label}
            </div>

            {recognizedText && (
              <div className="mt-4 max-w-md rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-3 text-center text-sm text-slate-300">
                {recognizedText}
              </div>
            )}

            {error && (
              <p className="mt-4 text-xs text-red-400">{error}</p>
            )}

            {!isModelReady && (
              <p className="mt-4 text-xs text-slate-500">
                The local AI model must be ready before using voice. Check the
                model status in the header.
              </p>
            )}
          </div>

          {messages.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/40">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                <span className="text-xs font-medium text-slate-400">
                  Conversation
                </span>
                {isSpeaking && speechSynthesisSupported && (
                  <button
                    onClick={stopSpeaking}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                    Stop
                  </button>
                )}
              </div>
              <div
                ref={scrollRef}
                className="max-h-[320px] space-y-5 overflow-y-auto p-4 sm:p-6"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-sky-500/15 text-sky-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Cpu className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-sky-600 text-white rounded-tr-sm'
                          : 'bg-slate-700/60 text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      {message.role === 'assistant' && message.content && !isSpeaking && voiceState !== 'processing' && voiceState !== 'speaking' && speechSynthesisSupported && (
                        <button
                          onClick={() => speak(message.content)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-slate-700/60"
                        >
                          <Volume2 className="h-3 w-3" />
                          Read Response Aloud
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {voiceState === 'processing' && messages[messages.length - 1]?.content === '' && (
                  <div className="flex items-center gap-2 pl-11 text-xs text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-sky-400" />
                    Thinking locally…
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
