import { z } from 'zod';
export * from './auth.js';
export { createTimeline } from './timeline.js';
export { applyChange, fileKey, createScopeGuard } from './local-state.js';
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const name = z.string().trim().min(2).max(200);
const money = z.number().int().min(0).max(100_000_000_000);
export const projectSchema = z
  .object({
    id: id.default(() => crypto.randomUUID()),
    name,
    customer: z.string().max(200).default(''),
    city: z.string().max(300).default(''),
    budget: money,
    start: z.iso.date(),
    end: z.iso.date(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  })
  .refine((value) => value.end >= value.start, {
    path: ['end'],
    message: 'End date must not precede start date',
  });
export const taskSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  title: name,
  assignee: z.string().max(200).default(''),
  due: z.iso.date(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  weight: z.number().min(0.1).max(1000),
});
export const issueSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  title: name,
  description: z.string().max(5000).default(''),
  assignee: z.string().max(200).default(''),
  due: z.iso.date(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
});
export const budgetLineSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  name,
  category: z.enum(['materials', 'labor', 'equipment', 'other']),
  planned: money,
  actual: money,
  committed: money,
});
export const documentSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  name: z.string().min(1).max(255),
  size: z
    .number()
    .int()
    .min(0)
    .max(20 * 1024 * 1024),
  mime: z.string().max(200),
  createdAt: z.iso.datetime(),
});
export const memberSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  name,
  role: z.string().max(200),
  email: z.union([z.email(), z.literal('')]),
  phone: z.string().max(50),
});
export const requestSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  name,
  quantity: z.number().positive().max(1e9),
  unit: z.string().trim().min(1).max(30),
  due: z.iso.date(),
  status: z.enum(['requested', 'received']),
});
export const activitySchema = z.object({
  id,
  kind: z.enum([
    'eventProject',
    'eventTask',
    'eventIssue',
    'eventUpdate',
    'eventDocument',
    'eventBudget',
    'eventMember',
    'eventRequest',
    'eventDelete',
  ]),
  title: z.string().max(255),
  createdAt: z.iso.datetime(),
});
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    projects: z.array(projectSchema).max(1000),
    tasks: z.array(taskSchema).max(20000),
    issues: z.array(issueSchema).max(10000),
    budgetLines: z.array(budgetLineSchema).max(20000),
    documents: z.array(documentSchema).max(10000),
    members: z.array(memberSchema).max(5000),
    requests: z.array(requestSchema).max(10000),
    activity: z.array(activitySchema).max(200),
  })
  .superRefine((value, context) => {
    const ids = new Set(value.projects.map((project) => project.id));
    for (const collection of [
      'tasks',
      'issues',
      'budgetLines',
      'documents',
      'requests',
    ] as const) {
      for (const [index, item] of value[collection].entries())
        if (!ids.has(item.projectId))
          context.addIssue({
            code: 'custom',
            path: [collection, index, 'projectId'],
            message: 'Unknown project',
          });
    }
    for (const collection of [
      'projects',
      'tasks',
      'issues',
      'budgetLines',
      'documents',
      'members',
      'requests',
    ] as const) {
      if (
        new Set(value[collection].map((item) => item.id)).size !==
        value[collection].length
      )
        context.addIssue({
          code: 'custom',
          path: [collection],
          message: 'Duplicate IDs',
        });
    }
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Issue = z.infer<typeof issueSchema>;
export { dateKey, formatKazakhDate } from './format.js';
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  projects: [],
  tasks: [],
  issues: [],
  budgetLines: [],
  documents: [],
  members: [],
  requests: [],
  activity: [],
});
export function progress(
  tasks: ReadonlyArray<{ status: string; weight: number }>,
): number | null {
  const included = tasks.filter((task) => task.status !== 'CANCELLED');
  const total = included.reduce((sum, task) => sum + task.weight, 0);
  return total === 0
    ? null
    : Math.round(
        (included
          .filter((task) => task.status === 'DONE')
          .reduce((sum, task) => sum + task.weight, 0) /
          total) *
          100,
      );
}
export function budgetTotals(
  lines: ReadonlyArray<{ planned: number; actual: number; committed: number }>,
) {
  const sums = lines.reduce(
    (total, line) => ({
      planned: total.planned + line.planned,
      actual: total.actual + line.actual,
      committed: total.committed + line.committed,
    }),
    { planned: 0, actual: 0, committed: 0 },
  );
  return {
    ...sums,
    exposure: sums.actual + sums.committed,
    variance: sums.planned - sums.actual - sums.committed,
  };
}
