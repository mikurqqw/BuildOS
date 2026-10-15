import { expect, it } from 'vitest';
import { createDemo } from '../../../apps/web/src/data/demo';
import { localizeDemo } from '../../../apps/web/src/data/demo-copy';
it('starts demo content in Russian while preserving project names', () => {
  const data = createDemo();
  expect(data.tasks[0]?.title).toBe('Фундамент · блок А');
  expect(data.members[0]?.role).toBe('Руководитель проекта');
  expect(data.projects[0]?.name).toBe('Alatau Residence');
});
it('projects demo copy into all three languages without mutating source or custom input', () => {
  const data = createDemo();
  data.tasks.push({
    ...data.tasks[0]!,
    id: 'custom',
    title: 'Мой собственный текст',
  });
  expect(localizeDemo(data, 'en').tasks[0]?.title).toBe('Foundation · Block A');
  expect(localizeDemo(data, 'kk').tasks[0]?.title).toBe('Іргетас · А блогы');
  expect(localizeDemo(data, 'en').tasks.at(-1)?.title).toBe(
    'Мой собственный текст',
  );
  expect(data.tasks[0]?.title).toBe('Фундамент · блок А');
  expect(localizeDemo(data, 'kk').projects[0]?.name).toBe('Alatau Residence');
});
