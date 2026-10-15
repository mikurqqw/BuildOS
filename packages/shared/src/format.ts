export function dateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qyzylorda',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function formatKazakhDate(value: string): string {
  // Some embedded browsers omit Kazakh ICU month data and render "M10".
  const months = [
    'қаңтар',
    'ақпан',
    'наурыз',
    'сәуір',
    'мамыр',
    'маусым',
    'шілде',
    'тамыз',
    'қыркүйек',
    'қазан',
    'қараша',
    'желтоқсан',
  ];
  const [year, month, day] = dateKey(new Date(value)).split('-');
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}
