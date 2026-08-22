import path from 'node:path';

export function resolveWorkspacePath(workspace: string, target: string): string {
  const workspaceRoot = path.resolve(workspace);
  const resolvedPath = path.resolve(workspaceRoot, target);

  if (resolvedPath !== workspaceRoot && !resolvedPath.startsWith(workspaceRoot + path.sep)) {
    throw new Error(`Path "${target}" is outside the workspace.`);
  }

  return resolvedPath;
}
