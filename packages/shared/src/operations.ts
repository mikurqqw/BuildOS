import { z } from 'zod';
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(2).max(200);
export const accessRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'EMPLOYEE',
  'PROCUREMENT',
  'FINANCE',
  'VIEWER',
]);
export type AccessRole = z.infer<typeof accessRoleSchema>;
export const supplierSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  name: text,
  contact: z.string().max(200).default(''),
  email: z.union([z.email(), z.literal('')]).default(''),
  phone: z.string().max(50).default(''),
  notes: z.string().max(2000).default(''),
  active: z.boolean().default(true),
});
export const stockMovementSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  requestId: id,
  direction: z.enum(['IN', 'OUT']),
  quantity: z.number().positive().max(1e9),
  date: z.iso.date(),
  note: z.string().trim().max(1000).default(''),
  createdBy: z.string().max(100).optional(),
});
export const paymentSchema = z.object({
  id: id.default(() => crypto.randomUUID()),
  projectId: id,
  budgetLineId: id.optional(),
  payee: text,
  amount: z.number().int().positive().max(100_000_000_000),
  due: z.iso.date(),
  status: z.enum(['planned', 'paid', 'cancelled']).default('planned'),
  paidOn: z.iso.date().optional(),
  reference: z.string().trim().max(200).default(''),
  note: z.string().max(2000).default(''),
  createdBy: z.string().max(100).optional(),
});
export const stageSchema = z
  .object({
    id: id.default(() => crypto.randomUUID()),
    projectId: id,
    name: text,
    start: z.iso.date(),
    end: z.iso.date(),
  })
  .refine((item) => item.end >= item.start, {
    path: ['end'],
    message: 'Invalid stage dates',
  });
export type Supplier = z.infer<typeof supplierSchema>;
export type StockMovement = z.infer<typeof stockMovementSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Stage = z.infer<typeof stageSchema>;
export function stockBalance(
  data: { stockMovements: readonly StockMovement[] },
  requestId: string,
) {
  return data.stockMovements
    .filter((item) => item.requestId === requestId)
    .reduce(
      (sum, item) =>
        sum + (item.direction === 'IN' ? item.quantity : -item.quantity),
      0,
    );
}
export function paymentTotals(payments: readonly Payment[]) {
  return payments.reduce(
    (sum, item) => ({ ...sum, [item.status]: sum[item.status] + item.amount }),
    { planned: 0, paid: 0, cancelled: 0 },
  );
}
export function safeCsv(
  rows: readonly (readonly (string | number | null | undefined)[])[],
) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? '');
            if (typeof cell !== 'number' && /^[\s]*[=+@\-\t\r]/.test(value))
              value = "'" + value;
            return '"' + value.replaceAll('"', '""') + '"';
          })
          .join(';'),
      )
      .join('\r\n')
  );
}
