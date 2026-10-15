import type { Workspace } from './index.js';
import type { AccessRole } from './operations.js';
export type AccessActor = {
  id: string;
  role: AccessRole;
  allProjects: boolean;
  projectIds: string[];
};
export type WorkspaceCollection = Exclude<
  keyof Workspace,
  'version' | 'activity'
>;
export const demoActor: AccessActor = {
  id: 'demo-owner',
  role: 'OWNER',
  allProjects: true,
  projectIds: [],
};
export function canAccessProject(actor: AccessActor, id: string) {
  return (
    actor.role === 'OWNER' || actor.allProjects || actor.projectIds.includes(id)
  );
}
export function canApprove(actor: AccessActor) {
  return actor.role === 'OWNER' || actor.role === 'MANAGER';
}
export function canWrite(actor: AccessActor, collection: WorkspaceCollection) {
  if (actor.role === 'OWNER') return true;
  if (actor.role === 'VIEWER') return false;
  if (collection === 'members') return false;
  if (collection === 'documents') return true;
  if (collection === 'payments' || collection === 'budgetLines')
    return actor.role === 'FINANCE';
  if (collection === 'suppliers' || collection === 'stockMovements')
    return actor.role === 'PROCUREMENT' || actor.role === 'MANAGER';
  if (collection === 'projects' || collection === 'stages')
    return actor.role === 'MANAGER';
  if (collection === 'requests')
    return (
      actor.role === 'MANAGER' ||
      actor.role === 'PROCUREMENT' ||
      actor.role === 'EMPLOYEE'
    );
  return actor.role === 'MANAGER' || actor.role === 'EMPLOYEE';
}
export const projectCollections = [
  'tasks',
  'issues',
  'budgetLines',
  'documents',
  'requests',
  'stockMovements',
  'payments',
  'stages',
] as const;
export function visibleWorkspace(
  data: Workspace,
  actor: AccessActor,
): Workspace {
  if (actor.role === 'OWNER' || actor.allProjects) return structuredClone(data);
  const result = structuredClone(data);
  result.projects = result.projects.filter((item) =>
    canAccessProject(actor, item.id),
  );
  for (const collection of projectCollections) {
    Object.assign(result, {
      [collection]: result[collection].filter((item) =>
        canAccessProject(actor, item.projectId),
      ),
    });
  }
  result.activity = result.activity.filter(
    (item) => item.projectId && canAccessProject(actor, item.projectId),
  );
  return result;
}
export function mergeWorkspace(
  previous: Workspace,
  input: Workspace,
  actor: AccessActor,
): Workspace {
  const before = visibleWorkspace(previous, actor);
  const result = structuredClone(previous);
  const collections = [
    'projects',
    ...projectCollections,
    'suppliers',
    'members',
  ] as const;
  for (const collection of collections) {
    if (
      JSON.stringify(before[collection]) === JSON.stringify(input[collection])
    )
      continue;
    if (!canWrite(actor, collection)) throw new Error('FORBIDDEN');
    if (collection === 'projects') {
      if (input.projects.some((item) => !canAccessProject(actor, item.id)))
        throw new Error('FORBIDDEN_PROJECT');
      result.projects = [
        ...previous.projects.filter(
          (item) => !canAccessProject(actor, item.id),
        ),
        ...input.projects,
      ];
    } else if (projectCollections.some((key) => key === collection)) {
      const next = input[collection] as { id: string; projectId: string }[];
      if (next.some((item) => !canAccessProject(actor, item.projectId)))
        throw new Error('FORBIDDEN_PROJECT');
      const old = previous[collection] as { id: string; projectId: string }[];
      Object.assign(result, {
        [collection]: [
          ...old.filter((item) => !canAccessProject(actor, item.projectId)),
          ...next,
        ],
      });
    } else Object.assign(result, { [collection]: input[collection] });
  }
  const hidden = previous.activity.filter(
    (item) => item.projectId && !canAccessProject(actor, item.projectId),
  );
  if (
    input.activity.some(
      (item) => item.projectId && !canAccessProject(actor, item.projectId),
    )
  )
    throw new Error('FORBIDDEN_PROJECT');
  result.activity = [...input.activity, ...hidden].slice(0, 200);
  return result;
}
