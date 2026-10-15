import { expect, it } from 'vitest';
import { createTimeline } from './timeline';
it('handles empty schedules and expands a zero-day project into a readable calendar', () => {
  expect(createTimeline([])).toBeNull();
  const value = createTimeline([{ start: '2026-10-16', end: '2026-10-16' }]);
  expect(value?.ticks.length).toBeGreaterThan(0);
  expect(value!.end).toBeGreaterThan(value!.start);
});
it('bounds calendar tick count for long projects while preserving dates', () => {
  const value = createTimeline([{ start: '2020-01-01', end: '2090-12-31' }])!;
  expect(value.ticks.length).toBeLessThanOrEqual(24);
  expect(value.position('2020-01-01')).toBe(0);
  expect(value.position('2090-12-31')).toBeLessThan(100);
});
