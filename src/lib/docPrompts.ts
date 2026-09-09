import type { DocActionType } from '@/types';

const ACTION_PROMPTS: Record<Exclude<DocActionType, 'ask-ai'>, string> = {
  summarize: 'Summarize the following document concisely:',
  'key-points': 'Extract the key points from the following document as a bulleted list:',
  'explain-simply': 'Explain the following document in simple terms that anyone can understand:',
  'generate-questions':
    'Generate five thoughtful study questions based on the following document:',
};

const MAX_CONTEXT_CHARS = 6000;

function truncate(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return text.slice(0, MAX_CONTEXT_CHARS) + '\n…[truncated]';
}

export function buildDocPrompt(
  action: Exclude<DocActionType, 'ask-ai'>,
  docText: string
): string {
  return `${ACTION_PROMPTS[action]}\n\n---\n${truncate(docText)}\n---`;
}

export function buildAskPrompt(question: string, docText: string): string {
  return `Answer the following question based on the document below. If the answer is not in the document, say so.\n\nQuestion: ${question}\n\n---\n${truncate(docText)}\n---`;
}

export const ACTION_LABELS: Record<Exclude<DocActionType, 'ask-ai'>, string> = {
  summarize: 'Summarize',
  'key-points': 'Key Points',
  'explain-simply': 'Explain Simply',
  'generate-questions': 'Generate Questions',
};
