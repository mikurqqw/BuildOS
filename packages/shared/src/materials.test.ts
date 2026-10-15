import { expect, it } from 'vitest';
import {
  materialCatalog,
  materialUnits,
  resolveMaterialSelection,
  materialRequestLabel,
  unitLabel,
} from './materials.js';
it('resolves catalog variants with canonical names and locale-independent units', () => {
  const item = resolveMaterialSelection({
    materialId: 'concrete',
    variant: 'В30 (М400)',
    unit: 'm3',
  });
  expect(item).toEqual({
    materialId: 'concrete',
    name: 'Бетон',
    specification: 'В30 (М400)',
    unit: 'm3',
  });
  expect(materialRequestLabel(item, 'en')).toBe('Concrete · В30 (М400)');
  expect(unitLabel(item.unit, 'en')).toBe('m³');
});
it('preserves custom materials and units, rejecting blank and invalid selections', () => {
  expect(
    resolveMaterialSelection({
      materialId: 'other',
      customName: 'Особая деталь',
      unit: 'other',
      customUnit: 'ящик',
    }),
  ).toEqual({ name: 'Особая деталь', specification: '', unit: 'ящик' });
  expect(() =>
    resolveMaterialSelection({
      materialId: 'other',
      customName: ' ',
      unit: 'kg',
    }),
  ).toThrow();
  expect(() =>
    resolveMaterialSelection({
      materialId: 'concrete',
      variant: 'unknown',
      unit: 'kg',
    }),
  ).toThrow();
  expect(() =>
    resolveMaterialSelection({ materialId: 'missing', unit: 'kg' }),
  ).toThrow();
});
it('supports custom specifications and translated catalog labels', () => {
  const item = resolveMaterialSelection({
    materialId: 'concrete',
    variant: 'other',
    customVariant: 'В45 · особая смесь',
    unit: 't',
  });
  expect(materialRequestLabel(item, 'kk')).toBe('Бетон · В45 · особая смесь');
  expect(materialRequestLabel({ name: 'My own text' }, 'kk')).toBe(
    'My own text',
  );
});
it('has unique identifiers and valid defaults for all catalog entries', () => {
  expect(materialCatalog.length).toBeGreaterThan(60);
  expect(new Set(materialCatalog.map((item) => item.id)).size).toBe(
    materialCatalog.length,
  );
  for (const item of materialCatalog) {
    expect(materialUnits.some((unit) => unit.id === item.unit)).toBe(true);
    expect(item.labels.every((label) => label.length > 0)).toBe(true);
  }
});
