export type ModelStatus =
  | 'idle'
  | 'initializing'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface InitProgress {
  progress: number;
  text: string;
}

export type DocStatus = 'processing' | 'ready' | 'error';
export type DocFileType = 'pdf' | 'txt';

export interface DocRecord {
  id: string;
  name: string;
  fileType: DocFileType;
  fileSize: number;
  dateAdded: number;
  status: DocStatus;
  text: string;
  error?: string;
}

export type DocActionType =
  | 'summarize'
  | 'key-points'
  | 'explain-simply'
  | 'generate-questions'
  | 'ask-ai';

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NoteActionType = 'summarize' | 'rewrite' | 'bullet-points' | 'explain';

export interface ReminderRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  completed: boolean;
  createdAt: number;
}

// ─── Command System Types ─────────────────────────────────────────────

export type CommandIntent =
  | 'create_folder'
  | 'create_file'
  | 'read_file'
  | 'rename_file'
  | 'move_file'
  | 'copy_file'
  | 'delete_file'
  | 'search_files'
  | 'open_file'
  | 'open_folder'
  | 'save_memory'
  | 'search_memory'
  | 'chat';

export interface StructuredCommand {
  intent: CommandIntent;
  path?: string;
  content?: string;
  newName?: string;
  destDir?: string;
  query?: string;
  description?: string;
  rawText?: string;
}

export type CommandStage =
  | 'understanding'
  | 'awaiting_permission'
  | 'permission_granted'
  | 'executing'
  | 'completed'
  | 'denied'
  | 'error';

export interface CommandStatus {
  id: string;
  intent: CommandIntent;
  description: string;
  targetPath?: string;
  stage: CommandStage;
  result?: string;
  timestamp: number;
  isDestructive: boolean;
}

export type AssistantMode = 'explain' | 'act';

export interface MemoryRecord {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActionHistoryEntry {
  id: string;
  timestamp: number;
  intent: CommandIntent;
  target: string;
  allowed: boolean;
  success: boolean;
  error?: string;
}
