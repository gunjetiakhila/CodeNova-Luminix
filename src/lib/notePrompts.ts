import type { NoteActionType } from '@/types';

const ACTION_PROMPTS: Record<NoteActionType, string> = {
  summarize: 'Summarize the following note concisely:',
  rewrite: 'Rewrite the following note to be clearer and better structured, keeping the same meaning:',
  'bullet-points': 'Convert the following note into a clear bulleted list of key points:',
  explain: 'Explain the following note in simple terms that anyone can understand:',
};

const MAX_CONTEXT_CHARS = 6000;

function truncate(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return text.slice(0, MAX_CONTEXT_CHARS) + '\n…[truncated]';
}

export function buildNotePrompt(action: NoteActionType, title: string, content: string): string {
  const body = content.trim() || title.trim();
  return `${ACTION_PROMPTS[action]}\n\nTitle: ${title}\n\n---\n${truncate(body)}\n---`;
}

export const NOTE_ACTION_LABELS: Record<NoteActionType, string> = {
  summarize: 'Summarize',
  rewrite: 'Rewrite',
  'bullet-points': 'Bullet Points',
  explain: 'Explain',
};
