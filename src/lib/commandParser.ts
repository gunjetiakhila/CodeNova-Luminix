import type { StructuredCommand, CommandIntent } from '@/types';

const SYSTEM_PROMPT = `You are LocalMind, a private on-device AI assistant. You help the user with questions and can request device actions.

When the user asks you to perform a filesystem operation, respond with ONLY a JSON object on a single line, no other text. The JSON must have an "intent" field and relevant arguments.

Supported intents and their arguments:
- create_folder: { "intent": "create_folder", "path": "Documents/FolderName" }
- create_file: { "intent": "create_file", "path": "Documents/filename.txt", "content": "file contents" }
- read_file: { "intent": "read_file", "path": "Documents/filename.txt" }
- rename_file: { "intent": "rename_file", "path": "Documents/oldname.txt", "newName": "newname.txt" }
- move_file: { "intent": "move_file", "path": "Documents/file.txt", "destDir": "Documents/Subfolder" }
- copy_file: { "intent": "copy_file", "path": "Documents/file.txt", "destDir": "Documents/Backup" }
- delete_file: { "intent": "delete_file", "path": "Documents/file.txt" }
- search_files: { "intent": "search_files", "path": "Documents", "query": "search term" }
- open_file: { "intent": "open_file", "path": "Documents/file.txt" }
- open_folder: { "intent": "open_folder", "path": "Documents" }

For memory operations:
- save_memory: { "intent": "save_memory", "content": "the fact to remember" }
- search_memory: { "intent": "search_memory", "query": "what to search" }

Path rules:
- Use folder shortcuts: Documents, Downloads, Desktop, Home
- Subfolders use forward slashes: Documents/Projects/Python
- Never use .. or absolute system paths

If the user is just chatting or asking a question (not requesting a device action), respond normally with text. Do NOT wrap normal responses in JSON.`;

export function buildCommandExtractionPrompt(userMessage: string): string {
  return `${SYSTEM_PROMPT}\n\nUser message: ${userMessage}`;
}

export function parseCommandFromAiResponse(response: string): StructuredCommand | null {
  const trimmed = response.trim();

  // Try to find a JSON object in the response
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.intent || typeof parsed.intent !== 'string') return null;

    const allowedIntents: CommandIntent[] = [
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
    ];

    if (!allowedIntents.includes(parsed.intent)) return null;

    return {
      intent: parsed.intent,
      path: typeof parsed.path === 'string' ? parsed.path : typeof parsed.target === 'string' ? parsed.target : undefined,
      content: parsed.content,
      newName: parsed.newName,
      destDir: parsed.destDir,
      query: parsed.query,
      description: parsed.description,
    };
  } catch {
    return null;
  }
}

export function normalizeCommand(command: StructuredCommand, userMessage: string): StructuredCommand {
  const normalized = { ...command, rawText: userMessage };
  const documentDefaultIntents: CommandIntent[] = [
    'create_folder',
    'create_file',
    'read_file',
    'rename_file',
    'delete_file',
    'open_file',
    'open_folder',
  ];

  const normalizePath = (value: string | undefined): string | undefined => {
    if (!value) return value;
    const lower = value.toLowerCase();
    const hasKnownRoot = /^(documents|downloads|desktop|home)([\\/]|$)/i.test(value);
    if (hasKnownRoot || value.includes('/') || value.includes('\\')) return value;
    if (lower === 'python projects' || lower === 'python-projects') {
      return 'Documents/Python Projects';
    }
    return `Documents/${value}`;
  };

  if (documentDefaultIntents.includes(command.intent)) {
    normalized.path = normalizePath(command.path);
  }
  if (command.intent === 'move_file' || command.intent === 'copy_file') {
    normalized.path = normalizePath(command.path);
    normalized.destDir = normalizePath(command.destDir);
  }
  if (command.intent === 'search_files' && !command.path) {
    normalized.path = 'Documents';
  }
  return normalized;
}

export function isCommandResponse(response: string): boolean {
  return parseCommandFromAiResponse(response) !== null;
}
