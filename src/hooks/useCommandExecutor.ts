import { useCallback, useRef, useState } from 'react';
import type {
  StructuredCommand,
  CommandStatus,
  ActionHistoryEntry,
} from '@/types';
import { isDestructive, describeCommand } from '@/lib/commandRouter';
import { addActionHistory } from '@/lib/actionHistory';
import { saveMemory, searchMemories } from '@/lib/memoryStore';
import * as ipc from '@/lib/ipcClient';
import type { FsResult } from '@/electron';

interface SearchResult {
  path: string;
  name: string;
  isDir: boolean;
}

export function useCommandExecutor() {
  const [pendingCommand, setPendingCommand] = useState<StructuredCommand | null>(null);
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(null);

  const resolverRef = useRef<((value: string) => void) | null>(null);

  const executeCommand = useCallback(
    async (cmd: StructuredCommand): Promise<string> => {
      const statusId = crypto.randomUUID();
      const destructive = isDestructive(cmd.intent);
      const description = describeCommand(cmd);
      const targetPath = cmd.path || cmd.destDir || cmd.query || '';

      if (cmd.intent === 'save_memory') {
        const content = cmd.content || cmd.description || '';
        if (!content) return 'Nothing to save.';
        await saveMemory(content);
        setCommandStatus({
          id: statusId,
          intent: cmd.intent,
          description,
          stage: 'completed',
          result: 'Memory saved.',
          timestamp: Date.now(),
          isDestructive: false,
        });
        return `Saved to memory: "${content}"`;
      }

      if (cmd.intent === 'search_memory') {
        const results = await searchMemories(cmd.query || '');
        if (results.length === 0) {
          return 'No memories found matching that query.';
        }
        return results.map((m) => `- ${m.content}`).join('\n');
      }

      if (!ipc.isElectron()) {
        setCommandStatus({
          id: statusId,
          intent: cmd.intent,
          description,
          targetPath,
          stage: 'error',
          result: 'Device actions require the desktop app.',
          timestamp: Date.now(),
          isDestructive: destructive,
        });
        return 'This action requires the LocalMind desktop app. Device actions are not available in browser mode.';
      }

      return new Promise<string>((resolve) => {
        resolverRef.current = resolve;
        setPendingCommand(cmd);
        setCommandStatus({
          id: statusId,
          intent: cmd.intent,
          description,
          targetPath,
          stage: 'awaiting_permission',
          timestamp: Date.now(),
          isDestructive: destructive,
        });
      });
    },
    []
  );

  const allowCommand = useCallback(async () => {
    const cmd = pendingCommand;
    if (!cmd) return;
    const resolve = resolverRef.current;
    resolverRef.current = null;

    setCommandStatus((prev) =>
      prev ? { ...prev, stage: 'permission_granted' } : prev
    );

    await new Promise((r) => setTimeout(r, 300));

    setCommandStatus((prev) =>
      prev ? { ...prev, stage: 'executing' } : prev
    );

    let result: FsResult & { results?: SearchResult[] };

    try {
      switch (cmd.intent) {
        case 'create_folder':
          result = await ipc.createFolder(cmd.path!);
          break;
        case 'create_file':
          result = await ipc.createFile(cmd.path!, cmd.content || '');
          break;
        case 'read_file':
          result = await ipc.readFile(cmd.path!);
          break;
        case 'rename_file':
          result = await ipc.renameFile(cmd.path!, cmd.newName!);
          break;
        case 'move_file':
          result = await ipc.moveFile(cmd.path!, cmd.destDir!);
          break;
        case 'copy_file':
          result = await ipc.copyFile(cmd.path!, cmd.destDir!);
          break;
        case 'delete_file':
          result = await ipc.deleteFile(cmd.path!);
          break;
        case 'search_files':
          result = await ipc.searchFiles(cmd.path!, cmd.query!);
          break;
        case 'open_file':
          result = await ipc.openFile(cmd.path!);
          break;
        case 'open_folder':
          result = await ipc.openFolder(cmd.path!);
          break;
        default:
          result = { success: false, error: 'Unsupported command.' };
      }

      const target = cmd.path || cmd.destDir || cmd.query || '';
      const success = result.success;
      let resultText: string;

      if (success) {
        switch (cmd.intent) {
          case 'create_folder':
            resultText = `Folder "${cmd.path}" was created successfully.`;
            break;
          case 'create_file':
            resultText = `File "${cmd.path}" was created successfully.`;
            break;
          case 'read_file':
            resultText = result.content || '(empty file)';
            break;
          case 'rename_file':
            resultText = `Renamed to "${cmd.newName}" successfully.`;
            break;
          case 'move_file':
            resultText = `File moved to ${cmd.destDir} successfully.`;
            break;
          case 'copy_file':
            resultText = `File copied to ${cmd.destDir} successfully.`;
            break;
          case 'delete_file':
            resultText = `"${cmd.path}" was deleted successfully.`;
            break;
          case 'search_files': {
            const results = result.results || [];
            if (results.length === 0) {
              resultText = `No files matching "${cmd.query}" were found.`;
            } else {
              resultText = `Found ${results.length} result(s):\n${results
                .slice(0, 10)
                .map((r: SearchResult) => `  - ${r.name} (${r.isDir ? 'folder' : 'file'})`)
                .join('\n')}`;
            }
            break;
          }
          case 'open_file':
            resultText = `Opened "${cmd.path}".`;
            break;
          case 'open_folder':
            resultText = `Opened "${cmd.path}".`;
            break;
          default:
            resultText = 'Action completed.';
        }
      } else {
        const err = result.error || 'Unknown error';
        if (err === 'NOT_TRUSTED') {
          resultText =
            "This folder hasn't been granted access yet. Add it as a trusted folder in the Trusted Folders page.";
        } else {
          resultText = `I couldn't complete the action because: ${err}`;
        }
      }

      setCommandStatus((prev) =>
        prev
          ? {
              ...prev,
              stage: success ? 'completed' : 'error',
              result: resultText,
            }
          : prev
      );

      const historyEntry: ActionHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        intent: cmd.intent,
        target,
        allowed: true,
        success,
        error: success ? undefined : result.error,
      };
      await addActionHistory(historyEntry);

      setPendingCommand(null);

      if (resolve) resolve(resultText);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setCommandStatus((prev) =>
        prev ? { ...prev, stage: 'error', result: errMsg } : prev
      );
      const historyEntry: ActionHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        intent: cmd.intent,
        target: cmd.path || cmd.destDir || '',
        allowed: true,
        success: false,
        error: errMsg,
      };
      await addActionHistory(historyEntry);

      setPendingCommand(null);
      if (resolve) resolve(`I couldn't complete the action: ${errMsg}`);
    }
  }, [pendingCommand]);

  const denyCommand = useCallback(async () => {
    const cmd = pendingCommand;
    if (!cmd) return;
    const resolve = resolverRef.current;
    resolverRef.current = null;

    setCommandStatus((prev) =>
      prev ? { ...prev, stage: 'denied' } : prev
    );

    const historyEntry: ActionHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      intent: cmd.intent,
      target: cmd.path || cmd.destDir || '',
      allowed: false,
      success: false,
    };
    await addActionHistory(historyEntry);

    setPendingCommand(null);
    if (resolve)
      resolve('The action was denied. Let me know if you change your mind.');
  }, [pendingCommand]);

  const clearCommandStatus = useCallback(() => {
    setCommandStatus(null);
  }, []);

  return {
    pendingCommand,
    commandStatus,
    executeCommand,
    allowCommand,
    denyCommand,
    clearCommandStatus,
  };
}
