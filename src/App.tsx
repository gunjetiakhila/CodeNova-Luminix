import { useMemo, useRef, useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
  MessageSquare,
  FileText,
  StickyNote,
  Bell,
  Mic,
  Shield,
  History,
  Brain,
  LockKeyhole,
  Play,
  Info,
} from 'lucide-react';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import ErrorState from '@/components/ErrorState';
import ModelLoadProgress from '@/components/ModelLoadProgress';
import ModelStatusBadge from '@/components/ModelStatusBadge';
import DocumentsPage from '@/components/DocumentsPage';
import NotesPage from '@/components/NotesPage';
import RemindersPage from '@/components/RemindersPage';
import VoiceAssistantPage from '@/components/VoiceAssistantPage';
import PermissionDialog from '@/components/PermissionDialog';
import TrustedFoldersPage from '@/components/TrustedFoldersPage';
import ActionHistoryPage from '@/components/ActionHistoryPage';
import MemoryPage from '@/components/MemoryPage';
import CommandStatusBar from '@/components/CommandStatusBar';
import { useWebLLM } from '@/hooks/useWebLLM';
import { useCommandExecutor } from '@/hooks/useCommandExecutor';
import {
  buildCommandExtractionPrompt,
  normalizeCommand,
  parseCommandFromAiResponse,
} from '@/lib/commandParser';
import { validateCommand } from '@/lib/commandRouter';
import { isElectron } from '@/lib/ipcClient';
import type { AssistantMode, ChatMessage as ChatMessageType } from '@/types';

type Page =
  | 'chat'
  | 'documents'
  | 'notes'
  | 'reminders'
  | 'voice'
  | 'trusted'
  | 'history'
  | 'memory';

const welcomeMessage: ChatMessageType = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello. I’m a small language model running entirely on your device. Ask me anything and your messages will stay local.',
  timestamp: Date.now(),
};

function App() {
  const { status, progress, progressText, error, isGenerating, generate, retry } =
    useWebLLM();
  const [messages, setMessages] = useState<ChatMessageType[]>([welcomeMessage]);
  const [page, setPage] = useState<Page>('chat');
  const [mode, setMode] = useState<AssistantMode>('explain');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    pendingCommand,
    commandStatus,
    executeCommand,
    allowCommand,
    denyCommand,
    clearCommandStatus,
  } = useCommandExecutor();

  const canChat = status === 'ready' && !isGenerating;
  const modelLabel = useMemo(() => {
    if (status === 'ready') return 'Llama 3.2 · 1B Instruct';
    if (status === 'error') return 'Model unavailable';
    return 'Preparing local model';
  }, [status]);

  const sendMessage = async (content: string) => {
    if (!canChat) return;
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessageType = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantMessage]);

    try {
      if (mode === 'act') {
        const extractionPrompt = buildCommandExtractionPrompt(content);
        let aiResponse = '';
        await generate([{ role: 'user', content: extractionPrompt }], (chunk) => {
          aiResponse += chunk;
        });
        const parsedCommand = parseCommandFromAiResponse(aiResponse);
        const normalizedCommand = parsedCommand
          ? normalizeCommand(parsedCommand, content)
          : null;
        const command = normalizedCommand
          ? validateCommand(normalizedCommand)
          : null;

        if (command) {
          const result = await executeCommand(command);
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: result }
                : message
            )
          );
        } else {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content:
                      aiResponse ||
                      'I can help with supported device actions, or you can switch to Explain mode for questions.',
                  }
                : message
            )
          );
        }
        return;
      }

      await generate(
        nextMessages.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
        (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message
            )
          );
        }
      );
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: 'I couldn’t generate a local response. Please try again.',
              }
            : message
        )
      );
    }
  };

  const clearChat = () => setMessages([welcomeMessage]);

  const handleGenerate = async (
    prompt: string,
    onToken: (chunk: string) => void
  ): Promise<string> => {
    return generate([{ role: 'user', content: prompt }], onToken);
  };

  const navItems: { id: Page; label: string; icon: typeof MessageSquare }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'memory', label: 'Memory', icon: Brain },
  ];

  const securityItems: { id: Page; label: string; icon: typeof Shield }[] = [
    { id: 'trusted', label: 'Trusted Folders', icon: Shield },
    { id: 'history', label: 'Action History', icon: History },
  ];

  return (
    <main className="min-h-screen bg-[#0b1120] text-slate-100 selection:bg-sky-500/30">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between border-b border-slate-800/80 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">LocalMind</h1>
              <p className="text-xs text-slate-500">Private AI · Local Intelligence · Your Device</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-[11px] text-emerald-400 sm:flex">
              <LockKeyhole className="h-3.5 w-3.5" />
              {isElectron() ? 'Desktop secure mode' : 'Browser mode'}
            </div>
            <ModelStatusBadge status={status} />
          </div>
        </header>

        <nav className="flex flex-wrap items-center gap-1 border-b border-slate-800/80 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <span className="mx-1 hidden h-5 w-px bg-slate-800 sm:block" />
          {securityItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {page === 'chat' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Private by design · Nothing leaves your device
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Intelligence, kept local.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                Ask questions in Explain mode, or use Act mode for secure,
                permission-controlled device actions.
              </p>
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/40 shadow-2xl shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {modelLabel}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-800/80 p-0.5">
                    <button
                      onClick={() => setMode('explain')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        mode === 'explain'
                          ? 'bg-slate-700 text-slate-100'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Info className="h-3 w-3" />
                      Explain
                    </button>
                    <button
                      onClick={() => setMode('act')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        mode === 'act'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Play className="h-3 w-3" />
                      Act
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={clearChat}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {mode === 'act' && (
                <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/5 px-4 py-2 text-[11px] text-sky-300 sm:px-5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  ACT mode is permission-controlled. Every device action requires your approval.
                </div>
              )}

              {commandStatus && (
                <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
                  <CommandStatusBar status={commandStatus} />
                  {(commandStatus.stage === 'completed' || commandStatus.stage === 'denied' || commandStatus.stage === 'error') && (
                    <button
                      onClick={clearCommandStatus}
                      className="mt-2 text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      Dismiss status
                    </button>
                  )}
                </div>
              )}

              {status === 'error' ? (
                <ErrorState message={error ?? 'Your browser may not support local WebGPU inference.'} onRetry={retry} />
              ) : status !== 'ready' ? (
                <ModelLoadProgress progress={progress} text={progressText} />
              ) : (
                <>
                  <div className="min-h-[320px] flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isGenerating && messages[messages.length - 1]?.content === '' && (
                      <div className="flex items-center gap-2 pl-11 text-xs text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse text-sky-400" />
                        {mode === 'act' ? 'Understanding locally…' : 'Thinking locally…'}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="border-t border-slate-800/80 p-3 sm:p-4">
                    <ChatInput disabled={!canChat} onSend={sendMessage} />
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
                      <Zap className="h-3 w-3" />
                      {mode === 'act'
                        ? 'Actions are allowlisted and require permission'
                        : 'Responses are generated locally on your device'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : page === 'documents' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <DocumentsPage isModelReady={status === 'ready'} isGenerating={isGenerating} onGenerate={handleGenerate} />
          </section>
        ) : page === 'notes' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <NotesPage isModelReady={status === 'ready'} isGenerating={isGenerating} onGenerate={handleGenerate} />
          </section>
        ) : page === 'voice' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <VoiceAssistantPage isModelReady={status === 'ready'} onGenerate={handleGenerate} />
          </section>
        ) : page === 'memory' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <MemoryPage />
          </section>
        ) : page === 'trusted' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <TrustedFoldersPage />
          </section>
        ) : page === 'history' ? (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <ActionHistoryPage />
          </section>
        ) : (
          <section className="flex flex-1 flex-col py-8 sm:py-12">
            <RemindersPage />
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-slate-800/80 py-4 text-[11px] text-slate-600">
          <span>LocalMind · Private AI</span>
          <span>{isElectron() ? 'Secure desktop mode' : 'Browser mode'}</span>
        </footer>
      </div>

      {pendingCommand && (
        <PermissionDialog command={pendingCommand} onAllow={allowCommand} onDeny={denyCommand} />
      )}
    </main>
  );
}

export default App;
