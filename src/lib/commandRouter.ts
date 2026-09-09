import type { StructuredCommand, CommandIntent } from '@/types';

const ALLOWED_INTENTS: CommandIntent[] = [
  'create_folder',
  'create_file',
  'read_file',
  'rename_file',
  'move_file',
  'copy_file',
  'delete_file',
  'search_files',
  'open_file',
  'open_folder',
  'save_memory',
  'search_memory',
  'chat',
];

const DESTRUCTIVE_INTENTS: CommandIntent[] = ['delete_file'];

export function isDestructive(intent: CommandIntent): boolean {
  return DESTRUCTIVE_INTENTS.includes(intent);
}

export function validateCommand(cmd: unknown): StructuredCommand | null {
  if (!cmd || typeof cmd !== 'object') return null;
  const c = cmd as Record<string, unknown>;
  const intent = c.intent as CommandIntent;
  if (!intent || !ALLOWED_INTENTS.includes(intent)) return null;

  const command: StructuredCommand = {
    intent,
    path: typeof c.path === 'string' ? c.path : undefined,
    content: typeof c.content === 'string' ? c.content : undefined,
    newName: typeof c.newName === 'string' ? c.newName : undefined,
    destDir: typeof c.destDir === 'string' ? c.destDir : undefined,
    query: typeof c.query === 'string' ? c.query : undefined,
    description: typeof c.description === 'string' ? c.description : undefined,
  };

  const requiredByIntent: Partial<Record<CommandIntent, Array<keyof StructuredCommand>>> = {
    create_folder: ['path'],
    create_file: ['path'],
    read_file: ['path'],
    rename_file: ['path', 'newName'],
    move_file: ['path', 'destDir'],
    copy_file: ['path', 'destDir'],
    delete_file: ['path'],
    search_files: ['path', 'query'],
    open_file: ['path'],
    open_folder: ['path'],
    save_memory: ['content'],
    search_memory: ['query'],
  };
  const required = requiredByIntent[intent] || [];
  if (required.some((key) => typeof command[key] !== 'string' || !command[key]?.trim())) {
    return null;
  }

  const pathValues = [command.path, command.destDir].filter(
    (value): value is string => typeof value === 'string'
  );
  if (pathValues.some((value) => value.includes('\0') || /(^|[\\/])\.\.([\\/]|$)/.test(value) || /^[/\\]|^[A-Za-z]:/.test(value))) {
    return null;
  }

  return command;
}

export function describeCommand(cmd: StructuredCommand): string {
  switch (cmd.intent) {
    case 'create_folder':
      return `Create a folder at ${cmd.path}`;
    case 'create_file':
      return `Create a text file at ${cmd.path}`;
    case 'read_file':
      return `Read the file at ${cmd.path}`;
    case 'rename_file':
      return `Rename ${cmd.path} to ${cmd.newName}`;
    case 'move_file':
      return `Move ${cmd.path} to ${cmd.destDir}`;
    case 'copy_file':
      return `Copy ${cmd.path} to ${cmd.destDir}`;
    case 'delete_file':
      return `Delete ${cmd.path}`;
    case 'search_files':
      return `Search for "${cmd.query}" in ${cmd.path}`;
    case 'open_file':
      return `Open the file at ${cmd.path}`;
    case 'open_folder':
      return `Open the folder at ${cmd.path}`;
    case 'save_memory':
      return `Save to memory: ${cmd.content}`;
    case 'search_memory':
      return `Search memory for "${cmd.query}"`;
    default:
      return 'Unknown command';
  }
}
