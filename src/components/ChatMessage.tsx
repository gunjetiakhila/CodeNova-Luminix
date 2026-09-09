import { User, Cpu } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-sky-500/15 text-sky-400'
            : 'bg-emerald-500/15 text-emerald-400'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-sky-600 text-white rounded-tr-sm'
            : 'bg-slate-700/60 text-slate-100 rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}
