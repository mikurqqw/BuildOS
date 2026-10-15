import { expect, it } from 'vitest';
import { emptyWorkspace, workspaceSchema } from './index';
import { applyChange, fileKey, createScopeGuard } from './local-state';
it('rejects imported IDs that could enter a reserved file namespace', () => {
  const data = emptyWorkspace();
  data.members.push({
    id: 'demo:real-id',
    name: 'Name',
    role: '',
    email: '',
    phone: '',
  });
  expect(workspaceSchema.safeParse(data).success).toBe(false);
});
it('preserves concurrent changes and never mutates the current snapshot', () => {
  const initial = emptyWorkspace();
  const one = applyChange(initial, (draft) => {
    draft.members.push({
      id: 'one',
      name: 'First',
      role: '',
      email: '',
      phone: '',
    });
  });
  const two = applyChange(one, (draft) => {
    draft.members.push({
      id: 'two',
      name: 'Second',
      role: '',
      email: '',
      phone: '',
    });
  });
  expect(two.members).toHaveLength(2);
  expect(one.members).toHaveLength(1);
  expect(initial.members).toHaveLength(0);
});
it('isolates demo and real blobs even with identical imported IDs', () => {
  expect(fileKey('real-id', true)).not.toBe(fileKey('real-id', false));
  expect(fileKey('real-id', false)).toBe('real-id');
});
it('rejects pending operations after a workspace switch', () => {
  const guard = createScopeGuard();
  const pending = guard.capture();
  expect(guard.valid(pending)).toBe(true);
  guard.invalidate();
  expect(guard.valid(pending)).toBe(false);
});
