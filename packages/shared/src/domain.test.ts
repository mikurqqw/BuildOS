import { describe, expect, it } from 'vitest';
import {
  formatKazakhDate,
  progress,
  budgetTotals,
  projectSchema,
  workspaceSchema,
  dateKey,
} from './index';
describe('project metrics', () => {
  it('formats Kazakh month names without depending on browser ICU data', () =>
    expect(formatKazakhDate('2026-10-16T00:00:00Z')).toBe('16 қазан 2026'));
  it('uses the Kazakhstan calendar day across the UTC midnight boundary', () =>
    expect(dateKey(new Date('2026-10-15T23:00:00Z'))).toBe('2026-10-16'));
  it('keeps unknown progress unknown', () => expect(progress([])).toBeNull());
  it('weights completed tasks and excludes cancelled tasks', () => {
    expect(
      progress([
        { status: 'DONE', weight: 3 },
        { status: 'TODO', weight: 1 },
        { status: 'CANCELLED', weight: 10 },
      ]),
    ).toBe(75);
  });
  it('separates commitments from recognized actual costs', () => {
    expect(budgetTotals([{ planned: 100, actual: 50, committed: 20 }])).toEqual(
      { planned: 100, actual: 50, committed: 20, exposure: 70, variance: 30 },
    );
  });
  it('rejects invalid budgets and reversed project dates', () => {
    expect(
      projectSchema.safeParse({
        name: 'Build',
        customer: 'Client',
        budget: -1,
        start: '2026-10-20',
        end: '2026-10-01',
        city: 'Almaty',
        status: 'ACTIVE',
      }).success,
    ).toBe(false);
  });
  it('rejects malformed workspace imports', () =>
    expect(
      workspaceSchema.safeParse({ projects: [{ name: 'bad' }] }).success,
    ).toBe(false));
});
