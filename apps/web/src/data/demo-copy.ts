import type { Workspace } from '@buildos/shared';
type Locale = 'ru' | 'kk' | 'en';
const entries: readonly (readonly [string, string, string])[] = [
  ['Фундамент · блок А', 'Іргетас · А блогы', 'Foundation · Block A'],
  ['Армирование · 2 этаж', 'Арматуралау · 2-қабат', 'Reinforcement · Floor 2'],
  ['Приёмка бетона', 'Бетонды қабылдау', 'Concrete acceptance'],
  ['Фасад · блок Б', 'Қасбет · Б блогы', 'Facade · Block B'],
  ['Проверка вентиляции', 'Желдетуді тексеру', 'Ventilation inspection'],
  ['Монтаж электрики', 'Электр жүйесін монтаждау', 'Electrical installation'],
  [
    'Гидроизоляция · уровень −1',
    'Гидрооқшаулау · −1 деңгей',
    'Waterproofing · Level −1',
  ],
  [
    'Координация поставок',
    'Жеткізілімдерді үйлестіру',
    'Delivery coordination',
  ],
  [
    'Гидроизоляция · блок А, уровень −1',
    'Гидрооқшаулау · А блогы, −1 деңгей',
    'Waterproofing · Block A, level −1',
  ],
  [
    'Проверьте стык перед следующим этапом работ.',
    'Келесі жұмыс кезеңіне дейін түйіспені тексеріңіз.',
    'Check the joint before the next stage.',
  ],
  [
    'Сертификат бетона · поставка 024',
    'Бетон сертификаты · 024 жеткізілімі',
    'Concrete certificate · delivery 024',
  ],
  [
    'Приложите сертификат поставщика.',
    'Жеткізушінің сертификатын тіркеңіз.',
    'Attach the supplier certificate.',
  ],
  ['Строительные материалы', 'Құрылыс материалдары', 'Construction materials'],
  ['Строительные работы', 'Құрылыс жұмыстары', 'Construction works'],
  ['Руководитель проекта', 'Жоба жетекшісі', 'Project Manager'],
  ['Главный инженер', 'Бас инженер', 'Chief Engineer'],
  ['Инженер участка', 'Учаске инженері', 'Site Engineer'],
  [
    'ТОО «Алатау Девелопмент»',
    '«Алатау Девелопмент» ЖШС',
    'Alatau Development',
  ],
  ['ТОО «Северная группа»', '«Солтүстік топ» ЖШС', 'Northern Group'],
  ['Управление строительства', 'Құрылыс басқармасы', 'City Development'],
  [
    'Алматы · Бостандыкский район',
    'Алматы · Бостандық ауданы',
    'Almaty · Bostandyk district',
  ],
  [
    'Астана · Есильский район',
    'Астана · Есіл ауданы',
    'Astana · Esil district',
  ],
  [
    'Шымкент · Туранский район',
    'Шымкент · Тұран ауданы',
    'Shymkent · Turan district',
  ],
  ['Бетон В30', 'В30 бетоны', 'C30 concrete'],
  ['Арматура А500С', 'А500С арматурасы', 'A500C reinforcement'],
  [
    'Гидроизоляционная мембрана',
    'Гидрооқшаулау мембранасы',
    'Waterproofing membrane',
  ],
];
const indexes = { ru: 0, kk: 1, en: 2 } as const;
export function demoText(value: string, locale: Locale) {
  const entry = entries.find((item) => item.includes(value));
  return entry?.[indexes[locale]] ?? value;
}
export function localizeDemo(data: Workspace, locale: Locale): Workspace {
  const text = (value: string) => demoText(value, locale);
  return {
    ...data,
    projects: data.projects.map((item) => ({
      ...item,
      customer: text(item.customer),
      city: text(item.city),
    })),
    tasks: data.tasks.map((item) => ({ ...item, title: text(item.title) })),
    issues: data.issues.map((item) => ({
      ...item,
      title: text(item.title),
      description: text(item.description),
    })),
    budgetLines: data.budgetLines.map((item) => ({
      ...item,
      name: text(item.name),
    })),
    members: data.members.map((item) => ({ ...item, role: text(item.role) })),
    requests: data.requests.map((item) => ({
      ...item,
      name: text(item.name),
      unit:
        locale === 'en'
          ? item.unit.replace('м', 'm').replace('т', 't')
          : item.unit,
    })),
    activity: data.activity.map((item) => ({
      ...item,
      title: text(item.title),
    })),
  };
}
