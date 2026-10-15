import { workspaceSchema, type Workspace } from './index.js';
export function applyChange(
  current: Workspace,
  change: (draft: Workspace) => void,
): Workspace {
  const draft = structuredClone(current);
  change(draft);
  return workspaceSchema.parse(draft);
}
export function fileKey(id: string, demo: boolean): string {
  return demo ? `demo:${id}` : id;
}
export function createScopeGuard() {
  let generation = 0;
  return {
    capture: () => generation,
    valid: (scope: number) => scope === generation,
    invalidate: () => ++generation,
  };
}
