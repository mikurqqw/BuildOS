import { workspaceSchema, type Workspace } from './index.js';
import {
  canApprove,
  canWrite,
  type AccessActor,
  type WorkspaceCollection,
} from './access.js';
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const fail = (code: string): never => {
  throw new Error(code);
};
function protectedFields(
  before: object,
  after: object,
  fields: readonly string[],
) {
  const a = before as Record<string, unknown>,
    b = after as Record<string, unknown>;
  if (fields.some((key) => !same(a[key], b[key]))) fail('IMMUTABLE_RECORD');
}
export function validateWorkspaceChange(
  previous: Workspace,
  input: Workspace,
  actor: AccessActor,
): Workspace {
  const next = workspaceSchema.parse(input);
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
  ] satisfies WorkspaceCollection[]) {
    if (
      !same(previous[collection], next[collection]) &&
      !canWrite(actor, collection)
    )
      fail('FORBIDDEN');
  }
  const now = new Date().toISOString();
  for (const task of next.tasks) {
    if (
      ['IN_PROGRESS', 'DONE'].includes(task.status) &&
      task.dependsOn.some(
        (id) => next.tasks.find((item) => item.id === id)?.status !== 'DONE',
      )
    )
      fail('DEPENDENCIES_INCOMPLETE');
  }
  for (const old of previous.requests) {
    const item = next.requests.find((value) => value.id === old.id);
    if (
      !same(old, item) &&
      actor.role === 'EMPLOYEE' &&
      old.createdBy &&
      old.createdBy !== actor.id
    )
      fail('FORBIDDEN');
    if (!item) {
      if (!['requested', 'rejected', 'cancelled'].includes(old.status))
        fail('IMMUTABLE_REQUEST');
      continue;
    }
    if (same(old, item)) continue;
    if (
      actor.role === 'EMPLOYEE' &&
      old.createdBy &&
      old.createdBy !== actor.id
    )
      fail('FORBIDDEN');
    protectedFields(old, item, ['createdBy']);
    if (!['requested', 'rejected'].includes(old.status))
      protectedFields(old, item, [
        'projectId',
        'name',
        'materialId',
        'specification',
        'quantity',
        'unit',
        'due',
        ...(old.status === 'approved' && item.status === 'ordered'
          ? []
          : ['unitPrice', 'supplierId']),
      ]);
    if (item.status === old.status) {
      protectedFields(old, item, ['approvedBy', 'approvedAt']);
      continue;
    }
    const transitions: Record<string, readonly string[]> = {
      requested: ['submitted', 'cancelled'],
      submitted: ['approved', 'rejected', 'cancelled'],
      rejected: ['requested', 'cancelled'],
      approved: ['ordered', 'cancelled'],
      ordered: ['received'],
      received: [],
      cancelled: [],
    };
    if (!transitions[old.status]?.includes(item.status))
      fail('INVALID_TRANSITION');
    if (['approved', 'rejected'].includes(item.status)) {
      if (!canApprove(actor)) fail('FORBIDDEN_APPROVAL');
      if (actor.role !== 'OWNER' && old.createdBy === actor.id)
        fail('SELF_APPROVAL');
      item.approvedBy = actor.id;
      item.approvedAt = now;
    } else {
      protectedFields(old, item, ['approvedBy', 'approvedAt']);
    }
    if (
      ['ordered', 'received'].includes(item.status) &&
      !['OWNER', 'MANAGER', 'PROCUREMENT'].includes(actor.role)
    )
      fail('FORBIDDEN');
    if (
      item.status === 'ordered' &&
      (!item.supplierId ||
        !next.suppliers.some(
          (value) => value.id === item.supplierId && value.active,
        ) ||
        item.unitPrice <= 0)
    )
      fail('ORDER_DETAILS_REQUIRED');
  }
  for (const item of next.requests) {
    if (!previous.requests.some((old) => old.id === item.id)) {
      if (item.status !== 'requested') fail('INVALID_TRANSITION');
      item.createdBy = actor.id;
      delete item.approvedBy;
      delete item.approvedAt;
    }
  }
  for (const old of previous.stockMovements) {
    const item = next.stockMovements.find((value) => value.id === old.id);
    if (!same(old, item)) fail('IMMUTABLE_STOCK');
  }
  const newMoves = next.stockMovements.filter(
    (item) => !previous.stockMovements.some((old) => old.id === item.id),
  );
  for (const item of newMoves) {
    const request = next.requests.find((value) => value.id === item.requestId);
    const oldRequest = previous.requests.find(
      (value) => value.id === item.requestId,
    );
    if (!request || !oldRequest || request.projectId !== item.projectId)
      fail('INVALID_STOCK_REQUEST');
    if (
      item.direction === 'IN' &&
      !['ordered', 'received'].includes(oldRequest!.status)
    )
      fail('ORDER_REQUIRED');
    if (item.direction === 'OUT' && !item.note.trim())
      fail('STOCK_NOTE_REQUIRED');
    item.createdBy = actor.id;
  }
  for (const request of next.requests) {
    const movements = next.stockMovements.filter(
      (item) => item.requestId === request.id,
    );
    const incoming = movements
      .filter((item) => item.direction === 'IN')
      .reduce((sum, item) => sum + item.quantity, 0);
    const outgoing = movements
      .filter((item) => item.direction === 'OUT')
      .reduce((sum, item) => sum + item.quantity, 0);
    if (incoming > request.quantity + 1e-7) fail('EXCESS_RECEIPT');
    if (outgoing > incoming + 1e-7) fail('INSUFFICIENT_STOCK');
    if (
      previous.requests.find((item) => item.id === request.id)?.status ===
        'ordered' &&
      request.status === 'received' &&
      incoming + 1e-7 < request.quantity
    )
      fail('INCOMPLETE_RECEIPT');
    if (
      newMoves.some(
        (item) => item.requestId === request.id && item.direction === 'IN',
      ) &&
      incoming + 1e-7 >= request.quantity &&
      request.status === 'ordered'
    )
      request.status = 'received';
  }
  for (const old of previous.payments) {
    const item = next.payments.find((value) => value.id === old.id);
    if (old.status === 'paid' && !same(old, item)) fail('IMMUTABLE_PAYMENT');
    if (old.status === 'cancelled' && !same(old, item))
      fail('IMMUTABLE_PAYMENT');
    if (item) {
      protectedFields(old, item, ['createdBy']);
      if (
        old.status !== item.status &&
        !['paid', 'cancelled'].includes(item.status)
      )
        fail('INVALID_TRANSITION');
    }
  }
  for (const item of next.payments) {
    if (!previous.payments.some((old) => old.id === item.id))
      item.createdBy = actor.id;
    if (item.status === 'paid' && (!item.paidOn || !item.reference.trim()))
      fail('PAYMENT_EVIDENCE_REQUIRED');
  }
  for (const old of previous.documents) {
    const item = next.documents.find((value) => value.id === old.id);
    const series = old.seriesId ?? old.id;
    if (!item) {
      if (
        old.reviewStatus !== 'draft' ||
        previous.documents.some(
          (value) =>
            (value.seriesId ?? value.id) === series &&
            value.version > old.version,
        )
      )
        fail('IMMUTABLE_DOCUMENT');
      continue;
    }
    protectedFields(old, item, [
      'projectId',
      'id',
      'seriesId',
      'version',
      'name',
      'size',
      'mime',
      'createdAt',
    ]);
    if (item.reviewStatus === old.reviewStatus) {
      protectedFields(old, item, ['submittedBy', 'reviewedBy', 'reviewedAt']);
      if (old.reviewStatus !== 'draft')
        protectedFields(old, item, ['reviewNote']);
      continue;
    }
    const transitions: Record<string, string[]> = {
      draft: ['pending'],
      pending: ['approved', 'rejected'],
      approved: [],
      rejected: [],
    };
    if (!transitions[old.reviewStatus]?.includes(item.reviewStatus))
      fail('INVALID_DOCUMENT_TRANSITION');
    if (item.reviewStatus === 'pending') {
      item.submittedBy = actor.id;
      delete item.reviewedBy;
      delete item.reviewedAt;
      item.reviewNote = '';
    } else {
      if (!canApprove(actor)) fail('FORBIDDEN_APPROVAL');
      if (actor.role !== 'OWNER' && old.submittedBy === actor.id)
        fail('SELF_APPROVAL');
      if (item.reviewStatus === 'rejected' && !item.reviewNote.trim())
        fail('REVIEW_NOTE_REQUIRED');
      item.submittedBy = old.submittedBy;
      item.reviewedBy = actor.id;
      item.reviewedAt = now;
    }
  }
  for (const item of next.documents) {
    if (!previous.documents.some((old) => old.id === item.id)) {
      if (item.reviewStatus !== 'draft') fail('INVALID_DOCUMENT_TRANSITION');
      delete item.submittedBy;
      delete item.reviewedBy;
      delete item.reviewedAt;
      item.reviewNote = '';
    }
  }
  return workspaceSchema.parse(next);
}
