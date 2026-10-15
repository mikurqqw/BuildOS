import { ZodError } from 'zod';

export const errorsRu = {
  operationForbidden: 'Недостаточно прав для этого действия.',
  operationDependencies: 'Сначала завершите задачи-предшественники.',
  operationImmutable:
    'Запись защищена историей операций. Создайте новую запись или версию.',
  operationTransition:
    'Недопустимый переход статуса. Проверьте текущий этап согласования.',
  operationApproval:
    'Согласование доступно владельцу и руководителю. Руководитель не согласует собственные заявки.',
  operationStock:
    'Проверьте остаток, количество заказа и состояние поставки. Для выдачи укажите основание.',
  operationPayment: 'Для оплаты нужны дата и номер платёжного документа.',
  operationOrder:
    'Для заказа выберите действующего поставщика и укажите цену больше нуля.',
  operationReview: 'Укажите причину отклонения.',
  operationInvalid:
    'Проверьте данные и связи: сроки, этапы, предшественники и последовательность версий должны быть согласованы.',
};
export const errorsEn: Record<keyof typeof errorsRu, string> = {
  operationForbidden: 'You do not have permission for this action.',
  operationDependencies: 'Complete the predecessor tasks first.',
  operationImmutable:
    'This record is protected by its history. Create a new record or version.',
  operationTransition:
    'Invalid status transition. Check the current approval step.',
  operationApproval:
    'Only owners and managers can approve. Managers cannot approve their own submissions.',
  operationStock:
    'Check stock, order quantity and delivery status. Specify a reason for issuing stock.',
  operationPayment: 'Payment requires a date and document reference.',
  operationOrder:
    'Select an active supplier and enter a price greater than zero.',
  operationReview: 'Enter a rejection reason.',
  operationInvalid:
    'Check dates, stages, predecessors and consecutive document versions.',
};
export const errorsKk: Record<keyof typeof errorsRu, string> = {
  operationForbidden: 'Бұл әрекетке құқығыңыз жеткіліксіз.',
  operationDependencies: 'Алдымен алдыңғы тапсырмаларды аяқтаңыз.',
  operationImmutable:
    'Жазба операциялар тарихымен қорғалған. Жаңа жазба немесе нұсқа жасаңыз.',
  operationTransition:
    'Мәртебені ауыстыруға болмайды. Келісу кезеңін тексеріңіз.',
  operationApproval:
    'Иесі мен басшы ғана келіседі. Басшы өз өтінімін келісе алмайды.',
  operationStock:
    'Қалдықты, тапсырыс санын және жеткізу күйін тексеріңіз. Шығысқа негіз көрсетіңіз.',
  operationPayment: 'Төлемге күн мен төлем құжатының нөмірі қажет.',
  operationOrder: 'Белсенді жеткізушіні таңдап, нөлден үлкен баға көрсетіңіз.',
  operationReview: 'Қабылдамау себебін көрсетіңіз.',
  operationInvalid:
    'Күндерді, кезеңдерді, алдыңғы тапсырмаларды және құжат нұсқаларының ретін тексеріңіз.',
};

export function operationError(
  error: unknown,
  t: typeof errorsEn,
): string | undefined {
  if (error instanceof ZodError) return t.operationInvalid;
  if (!(error instanceof Error)) return;
  const code = error.message;
  if (code === 'FORBIDDEN_APPROVAL' || code === 'SELF_APPROVAL')
    return t.operationApproval;
  if (code.startsWith('FORBIDDEN')) return t.operationForbidden;
  if (code === 'DEPENDENCIES_INCOMPLETE') return t.operationDependencies;
  if (code.startsWith('IMMUTABLE')) return t.operationImmutable;
  if (code.includes('TRANSITION')) return t.operationTransition;
  if (
    [
      'INVALID_STOCK_REQUEST',
      'ORDER_REQUIRED',
      'STOCK_NOTE_REQUIRED',
      'EXCESS_RECEIPT',
      'INSUFFICIENT_STOCK',
      'INCOMPLETE_RECEIPT',
    ].includes(code)
  )
    return t.operationStock;
  if (code === 'PAYMENT_EVIDENCE_REQUIRED') return t.operationPayment;
  if (code === 'ORDER_DETAILS_REQUIRED') return t.operationOrder;
  if (code === 'REVIEW_NOTE_REQUIRED') return t.operationReview;
  if (code === 'INVALID_WORKSPACE') return t.operationInvalid;
}
