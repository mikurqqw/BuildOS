import { expect, it } from 'vitest';
import {
  emptyWorkspace,
  projectSchema,
  requestSchema,
  taskSchema,
  paymentSchema,
  documentSchema,
  supplierSchema,
  stockMovementSchema,
  workspaceSchema,
  safeCsv,
  mergeWorkspace,
  visibleWorkspace,
  validateWorkspaceChange,
  type AccessActor,
} from './index.js';
const owner: AccessActor = {
  id: 'owner',
  role: 'OWNER',
  allProjects: true,
  projectIds: [],
};
const viewer: AccessActor = {
  id: 'viewer',
  role: 'VIEWER',
  allProjects: false,
  projectIds: ['p1'],
};
function fixture() {
  const data = emptyWorkspace();
  data.projects = ['p1', 'p2'].map((id) =>
    projectSchema.parse({
      id,
      name: id,
      budget: 1000,
      start: '2026-01-01',
      end: '2027-01-01',
      status: 'ACTIVE',
    }),
  );
  data.suppliers.push(supplierSchema.parse({ id: 's1', name: 'Supplier' }));
  data.requests.push(
    requestSchema.parse({
      id: 'r1',
      projectId: 'p1',
      name: 'Concrete',
      quantity: 10,
      unit: 'm3',
      due: '2026-10-20',
      status: 'ordered',
      supplierId: 's1',
      unitPrice: 100,
      createdBy: 'employee',
    }),
  );
  return data;
}
it('preserves hidden projects on scoped writes and blocks viewer mutations', () => {
  const before = fixture();
  const actor = { ...viewer, role: 'EMPLOYEE' as const };
  const visible = visibleWorkspace(before, actor);
  expect(visible.projects.map((item) => item.id)).toEqual(['p1']);
  visible.tasks.push(
    taskSchema.parse({
      projectId: 'p1',
      title: 'Work',
      due: '2026-10-20',
      priority: 'MEDIUM',
      weight: 1,
      status: 'TODO',
    }),
  );
  const merged = mergeWorkspace(before, visible, actor);
  expect(merged.projects).toHaveLength(2);
  expect(() => mergeWorkspace(before, visible, viewer)).toThrow('FORBIDDEN');
});
it('requires approval before ordering and prevents a reviewer approving own submission', () => {
  const before = fixture();
  before.requests[0]!.status = 'requested';
  const next = structuredClone(before);
  next.requests[0]!.status = 'ordered';
  expect(() => validateWorkspaceChange(before, next, owner)).toThrow();
  before.requests[0]!.status = 'submitted';
  before.requests[0]!.createdBy = 'manager';
  next.requests[0]!.status = 'approved';
  expect(() =>
    validateWorkspaceChange(before, next, {
      ...owner,
      id: 'manager',
      role: 'MANAGER',
    }),
  ).toThrow();
});
it('validates receipts, append-only stock and nonnegative balances', () => {
  const before = fixture();
  const next = structuredClone(before);
  next.stockMovements.push(
    stockMovementSchema.parse({
      id: 'move1',
      projectId: 'p1',
      requestId: 'r1',
      direction: 'IN',
      quantity: 4,
      date: '2026-10-16',
    }),
  );
  expect(
    validateWorkspaceChange(before, next, owner).stockMovements[0]?.createdBy,
  ).toBe('owner');
  const over = structuredClone(next);
  over.stockMovements.push(
    stockMovementSchema.parse({
      projectId: 'p1',
      requestId: 'r1',
      direction: 'OUT',
      quantity: 5,
      date: '2026-10-16',
    }),
  );
  expect(() => validateWorkspaceChange(next, over, owner)).toThrow();
  const edited = structuredClone(next);
  edited.stockMovements[0]!.quantity = 3;
  expect(() => validateWorkspaceChange(next, edited, owner)).toThrow();
});
it('rejects dependency cycles and starting blocked work', () => {
  const data = fixture();
  data.tasks = ['t1', 't2'].map((id) =>
    taskSchema.parse({
      id,
      projectId: 'p1',
      title: id,
      due: '2026-10-20',
      priority: 'MEDIUM',
      weight: 1,
      status: 'TODO',
    }),
  );
  data.tasks[0]!.dependsOn = ['t2'];
  data.tasks[1]!.dependsOn = ['t1'];
  expect(workspaceSchema.safeParse(data).success).toBe(false);
  data.tasks[1]!.dependsOn = [];
  const next = structuredClone(data);
  next.tasks[0]!.status = 'IN_PROGRESS';
  expect(() => validateWorkspaceChange(data, next, owner)).toThrow();
});
it('requires paid evidence and protects paid records', () => {
  const before = fixture();
  const next = structuredClone(before);
  next.payments.push(
    paymentSchema.parse({
      id: 'pay1',
      projectId: 'p1',
      payee: 'Supplier',
      amount: 500,
      due: '2026-10-16',
      status: 'paid',
    }),
  );
  expect(() => validateWorkspaceChange(before, next, owner)).toThrow();
  next.payments[0]!.paidOn = '2026-10-16';
  next.payments[0]!.reference = 'Bank ref 100';
  const saved = validateWorkspaceChange(before, next, owner);
  const edited = structuredClone(saved);
  edited.payments[0]!.amount = 100;
  expect(() => validateWorkspaceChange(saved, edited, owner)).toThrow();
});
it('requires document review and preserves historical versions', () => {
  const before = fixture();
  before.documents.push(
    documentSchema.parse({
      id: 'f1',
      projectId: 'p1',
      name: 'drawing.pdf',
      size: 10,
      mime: 'application/pdf',
      createdAt: new Date().toISOString(),
      reviewStatus: 'approved',
    }),
  );
  const next = structuredClone(before);
  next.documents = [];
  expect(() => validateWorkspaceChange(before, next, owner)).toThrow();
  next.documents = [
    ...before.documents,
    documentSchema.parse({
      ...before.documents[0]!,
      id: 'f2',
      seriesId: 'f1',
      version: 2,
      reviewStatus: 'draft',
    }),
  ];
  expect(validateWorkspaceChange(before, next, owner).documents).toHaveLength(
    2,
  );
});
it('escapes spreadsheet formulas and preserves numeric cells in CSV', () => {
  const csv = safeCsv([
    ['=cmd', '+SUM(A1)', '@x', '-abc', 'quote"text'],
    [12, -3, 'normal', 'line\nvalue'],
  ]);
  expect(csv).toContain("'=cmd");
  expect(csv).toContain('"-3"');
  expect(csv).toContain('quote""text');
});
it('does not let an employee delete another employee draft', () => {
  const before = fixture();
  before.requests[0]!.status = 'requested';
  const next = structuredClone(before);
  next.requests = [];
  expect(() =>
    validateWorkspaceChange(before, next, {
      ...owner,
      id: 'other',
      role: 'EMPLOYEE',
    }),
  ).toThrow('FORBIDDEN');
});
it('orders an approved request with a supplier and completes receipt in parts', () => {
  const before = fixture();
  before.requests[0]!.status = 'approved';
  before.requests[0]!.unitPrice = 0;
  delete before.requests[0]!.supplierId;
  const order = structuredClone(before);
  Object.assign(order.requests[0]!, {
    status: 'ordered',
    supplierId: 's1',
    unitPrice: 100,
  });
  const ordered = validateWorkspaceChange(before, order, owner);
  const first = structuredClone(ordered);
  first.stockMovements.push(
    stockMovementSchema.parse({
      id: 'first',
      projectId: 'p1',
      requestId: 'r1',
      direction: 'IN',
      quantity: 4,
      date: '2026-10-16',
    }),
  );
  const partial = validateWorkspaceChange(ordered, first, owner);
  expect(partial.requests[0]?.status).toBe('ordered');
  const last = structuredClone(partial);
  last.stockMovements.push(
    stockMovementSchema.parse({
      id: 'last',
      projectId: 'p1',
      requestId: 'r1',
      direction: 'IN',
      quantity: 6,
      date: '2026-10-17',
    }),
  );
  expect(
    validateWorkspaceChange(partial, last, owner).requests[0]?.status,
  ).toBe('received');
});
it('rejects missing document versions and cross-project versions', () => {
  const data = fixture();
  const first = documentSchema.parse({
    id: 'f1',
    projectId: 'p1',
    name: 'drawing.pdf',
    size: 10,
    mime: 'application/pdf',
    createdAt: new Date().toISOString(),
  });
  data.documents = [
    first,
    documentSchema.parse({ ...first, id: 'f3', seriesId: 'f1', version: 3 }),
  ];
  expect(workspaceSchema.safeParse(data).success).toBe(false);
  data.documents[1]!.version = 2;
  data.documents[1]!.projectId = 'p2';
  expect(workspaceSchema.safeParse(data).success).toBe(false);
});
