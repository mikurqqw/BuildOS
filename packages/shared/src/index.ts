import { z } from 'zod';
import {
  supplierSchema,
  stockMovementSchema,
  paymentSchema,
  stageSchema,
} from './operations.js';
export * from './operations.js';
export * from './access.js';
export * from './policies.js';
export * from './auth.js';
export * from './materials.js';
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
  start: z.iso.date().optional(),
  stageId: id.optional(),
  dependsOn: z.array(id).max(100).default([]),
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
  seriesId: id.optional(),
  version: z.number().int().min(1).default(1),
  reviewStatus: z
    .enum(['draft', 'pending', 'approved', 'rejected'])
    .default('draft'),
  submittedBy: z.string().max(100).optional(),
  reviewedBy: z.string().max(100).optional(),
  reviewedAt: z.iso.datetime().optional(),
  reviewNote: z.string().max(1000).default(''),
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
  materialId: z.string().max(80).optional(),
  specification: z.string().max(120).optional(),
  quantity: z.number().positive().max(1e9),
  unit: z.string().trim().min(1).max(30),
  due: z.iso.date(),
  status: z.enum([
    'requested',
    'submitted',
    'approved',
    'rejected',
    'ordered',
    'received',
    'cancelled',
  ]),
  supplierId: id.optional(),
  unitPrice: z.number().int().min(0).max(100_000_000_000).default(0),
  createdBy: z.string().max(100).optional(),
  approvedBy: z.string().max(100).optional(),
  approvedAt: z.iso.datetime().optional(),
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
  projectId: id.optional(),
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
    suppliers: z.array(supplierSchema).max(10000).default([]),
    stockMovements: z.array(stockMovementSchema).max(50000).default([]),
    payments: z.array(paymentSchema).max(20000).default([]),
    stages: z.array(stageSchema).max(10000).default([]),
  })
  .superRefine((value, context) => {
    const ids = new Set(value.projects.map((project) => project.id));
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    const tasks = new Map(value.tasks.map((item) => [item.id, item]));
    const stages = new Map(value.stages.map((item) => [item.id, item]));
    const budget = new Map(value.budgetLines.map((item) => [item.id, item]));
    const requests = new Map(value.requests.map((item) => [item.id, item]));
    const suppliers = new Set(value.suppliers.map((item) => item.id));
    const degree = new Map(value.tasks.map((item) => [item.id, 0]));
    const followers = new Map<string, string[]>();
    value.tasks.forEach((task, index) => {
      if (task.start && task.start > task.due)
        issue(['tasks', index, 'start'], 'INVALID_TASK_DATES');
      if (new Set(task.dependsOn).size !== task.dependsOn.length)
        issue(['tasks', index, 'dependsOn'], 'DUPLICATE_DEPENDENCY');
      for (const id of task.dependsOn) {
        const parent = tasks.get(id);
        if (!parent || parent.projectId !== task.projectId || id === task.id) {
          issue(['tasks', index, 'dependsOn'], 'INVALID_DEPENDENCY');
          continue;
        }
        degree.set(task.id, (degree.get(task.id) ?? 0) + 1);
        followers.set(id, [...(followers.get(id) ?? []), task.id]);
        if (parent.due > (task.start ?? task.due))
          issue(['tasks', index, 'dependsOn'], 'DEPENDENCY_DATES');
      }
      if (task.stageId) {
        const stage = stages.get(task.stageId);
        if (!stage || stage.projectId !== task.projectId)
          issue(['tasks', index, 'stageId'], 'INVALID_STAGE');
        else if (task.due > stage.end || (task.start ?? task.due) < stage.start)
          issue(['tasks', index, 'stageId'], 'TASK_OUTSIDE_STAGE');
      }
    });
    const queue = [...degree]
      .filter(([, count]) => count === 0)
      .map(([id]) => id);
    let visited = 0;
    for (let index = 0; index < queue.length; index++) {
      visited++;
      for (const child of followers.get(queue[index]!) ?? []) {
        degree.set(child, degree.get(child)! - 1);
        if (degree.get(child) === 0) queue.push(child);
      }
    }
    if (visited !== value.tasks.length) issue(['tasks'], 'DEPENDENCY_CYCLE');
    value.stages.forEach((stage, index) => {
      const project = value.projects.find(
        (item) => item.id === stage.projectId,
      );
      if (project && (stage.start < project.start || stage.end > project.end))
        issue(['stages', index], 'STAGE_OUTSIDE_PROJECT');
    });
    value.requests.forEach((item, index) => {
      if (item.supplierId && !suppliers.has(item.supplierId))
        issue(['requests', index, 'supplierId'], 'UNKNOWN_SUPPLIER');
    });
    value.stockMovements.forEach((item, index) => {
      if (requests.get(item.requestId)?.projectId !== item.projectId)
        issue(['stockMovements', index, 'requestId'], 'INVALID_STOCK_REQUEST');
    });
    value.payments.forEach((item, index) => {
      if (
        item.budgetLineId &&
        budget.get(item.budgetLineId)?.projectId !== item.projectId
      )
        issue(['payments', index, 'budgetLineId'], 'INVALID_BUDGET_REFERENCE');
    });
    const series = new Map<string, typeof value.documents>();
    for (const document of value.documents) {
      const key = document.seriesId ?? document.id;
      series.set(key, [...(series.get(key) ?? []), document]);
    }
    for (const [id, documents] of series) {
      const sorted = [...documents].sort((a, b) => a.version - b.version);
      if (
        sorted[0]?.id !== id ||
        sorted.some(
          (item, index) =>
            item.version !== index + 1 ||
            item.projectId !== sorted[0]?.projectId,
        )
      )
        issue(['documents'], 'INVALID_DOCUMENT_VERSIONS');
    }
    for (const collection of [
      'tasks',
      'issues',
      'budgetLines',
      'documents',
      'requests',
      'stockMovements',
      'payments',
      'stages',
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
      'suppliers',
      'stockMovements',
      'payments',
      'stages',
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
  suppliers: [],
  stockMovements: [],
  payments: [],
  stages: [],
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
