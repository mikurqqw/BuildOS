export type MaterialLocale = 'ru' | 'kk' | 'en';
type Labels = readonly [string, string, string];
export const localized = (labels: Labels, locale: MaterialLocale) =>
  labels[{ ru: 0, kk: 1, en: 2 }[locale]]!;
export const materialCategories = [
  {
    id: 'structure',
    labels: ['Бетон и растворы', 'Бетон және ерітінділер', 'Concrete & mortar'],
  },
  {
    id: 'metal',
    labels: [
      'Металл и арматура',
      'Металл және арматура',
      'Steel & reinforcement',
    ],
  },
  {
    id: 'masonry',
    labels: ['Кирпич и блоки', 'Кірпіш және блоктар', 'Bricks & blocks'],
  },
  {
    id: 'aggregates',
    labels: [
      'Сыпучие и смеси',
      'Сусымалы материалдар мен қоспалар',
      'Aggregates & mixes',
    ],
  },
  { id: 'insulation', labels: ['Изоляция', 'Оқшаулау', 'Insulation'] },
  {
    id: 'roof',
    labels: ['Кровля и фасад', 'Шатыр және қасбет', 'Roofing & facade'],
  },
  {
    id: 'timber',
    labels: ['Дерево и опалубка', 'Ағаш және қалып', 'Timber & formwork'],
  },
  { id: 'finishing', labels: ['Отделка', 'Әрлеу', 'Finishes'] },
  {
    id: 'electrical',
    labels: ['Электрика', 'Электр материалдары', 'Electrical'],
  },
  {
    id: 'plumbing',
    labels: [
      'Водоснабжение и отопление',
      'Су және жылыту',
      'Plumbing & heating',
    ],
  },
  { id: 'ventilation', labels: ['Вентиляция', 'Желдету', 'Ventilation'] },
  {
    id: 'fixings',
    labels: [
      'Крепёж и расходники',
      'Бекіткіштер және шығын материалдары',
      'Fixings & consumables',
    ],
  },
  {
    id: 'landscape',
    labels: ['Благоустройство', 'Абаттандыру', 'Landscaping'],
  },
] as const satisfies readonly { id: string; labels: Labels }[];
export const materialUnits = [
  {
    id: 'kg',
    labels: ['кг', 'кг', 'kg'],
    names: ['Килограмм', 'Килограмм', 'Kilogram'],
  },
  { id: 't', labels: ['т', 'т', 't'], names: ['Тонна', 'Тонна', 'Tonne'] },
  { id: 'g', labels: ['г', 'г', 'g'], names: ['Грамм', 'Грамм', 'Gram'] },
  { id: 'm', labels: ['м', 'м', 'm'], names: ['Метр', 'Метр', 'Metre'] },
  {
    id: 'm2',
    labels: ['м²', 'м²', 'm²'],
    names: ['Квадратный метр', 'Шаршы метр', 'Square metre'],
  },
  {
    id: 'm3',
    labels: ['м³', 'м³', 'm³'],
    names: ['Кубический метр', 'Текше метр', 'Cubic metre'],
  },
  {
    id: 'km',
    labels: ['км', 'км', 'km'],
    names: ['Километр', 'Километр', 'Kilometre'],
  },
  { id: 'l', labels: ['л', 'л', 'L'], names: ['Литр', 'Литр', 'Litre'] },
  {
    id: 'pcs',
    labels: ['шт.', 'дана', 'pcs'],
    names: ['Штука', 'Дана', 'Piece'],
  },
  { id: 'bag', labels: ['меш.', 'қап', 'bag'], names: ['Мешок', 'Қап', 'Bag'] },
  {
    id: 'roll',
    labels: ['рул.', 'орам', 'roll'],
    names: ['Рулон', 'Орам', 'Roll'],
  },
  {
    id: 'pack',
    labels: ['упак.', 'қапт.', 'pack'],
    names: ['Упаковка', 'Қаптама', 'Pack'],
  },
  {
    id: 'set',
    labels: ['компл.', 'жиынт.', 'set'],
    names: ['Комплект', 'Жиынтық', 'Set'],
  },
  {
    id: 'pallet',
    labels: ['подд.', 'тұғыр', 'pallet'],
    names: ['Поддон', 'Тұғыр', 'Pallet'],
  },
  {
    id: 'pair',
    labels: ['пар', 'жұп', 'pair'],
    names: ['Пара', 'Жұп', 'Pair'],
  },
] as const satisfies readonly { id: string; labels: Labels; names: Labels }[];
type Material = {
  id: string;
  category: (typeof materialCategories)[number]['id'];
  labels: Labels;
  unit: string;
  variants: readonly string[];
};
const entry = (
  id: string,
  category: Material['category'],
  labels: Labels,
  unit: string,
  variants: readonly string[] = [],
): Material => ({ id, category, labels, unit, variants });
export const materialCatalog: readonly Material[] = [
  entry('concrete', 'structure', ['Бетон', 'Бетон', 'Concrete'], 'm3', [
    'В7,5 (М100)',
    'В15 (М200)',
    'В20 (М250)',
    'В22,5 (М300)',
    'В25 (М350)',
    'В30 (М400)',
    'В35 (М450)',
    'В40 (М550)',
  ]),
  entry(
    'mortar',
    'structure',
    ['Кладочный раствор', 'Қалау ерітіндісі', 'Masonry mortar'],
    'm3',
    ['М50', 'М75', 'М100', 'М150', 'М200'],
  ),
  entry(
    'precast',
    'structure',
    ['Плита перекрытия', 'Жабын плитасы', 'Precast floor slab'],
    'pcs',
    ['ПК', 'ПБ', 'ПНО'],
  ),
  entry(
    'foundation-block',
    'structure',
    ['Фундаментный блок', 'Іргетас блогы', 'Foundation block'],
    'pcs',
    ['ФБС 24.4.6', 'ФБС 24.5.6', 'ФБС 24.6.6', 'ФБС 12.4.6'],
  ),
  entry(
    'lintel',
    'structure',
    ['Железобетонная перемычка', 'Темірбетон маңдайша', 'Concrete lintel'],
    'pcs',
    ['1ПБ', '2ПБ', '3ПБ'],
  ),
  entry('rebar', 'metal', ['Арматура', 'Арматура', 'Reinforcement'], 't', [
    'А500С · Ø8 мм',
    'А500С · Ø10 мм',
    'А500С · Ø12 мм',
    'А500С · Ø14 мм',
    'А500С · Ø16 мм',
    'А500С · Ø20 мм',
    'А500С · Ø25 мм',
    'А240 · Ø6 мм',
    'А240 · Ø8 мм',
  ]),
  entry(
    'mesh',
    'metal',
    ['Сетка арматурная', 'Арматуралық тор', 'Reinforcing mesh'],
    'm2',
    ['100×100×4 мм', '100×100×5 мм', '150×150×5 мм', '200×200×6 мм'],
  ),
  entry(
    'binding-wire',
    'metal',
    ['Проволока вязальная', 'Байлау сымы', 'Binding wire'],
    'kg',
    ['Ø1,0 мм', 'Ø1,2 мм', 'Ø1,4 мм', 'Ø1,6 мм'],
  ),
  entry(
    'steel-sheet',
    'metal',
    ['Лист стальной', 'Болат табақ', 'Steel sheet'],
    't',
    ['2 мм', '3 мм', '4 мм', '5 мм', '8 мм', '10 мм'],
  ),
  entry(
    'steel-angle',
    'metal',
    ['Уголок стальной', 'Болат бұрыштық', 'Steel angle'],
    'm',
    ['25×25×3 мм', '40×40×4 мм', '50×50×5 мм', '75×75×6 мм'],
  ),
  entry('channel', 'metal', ['Швеллер', 'Швеллер', 'Steel channel'], 'm', [
    '8П',
    '10П',
    '12П',
    '16П',
    '20П',
  ]),
  entry('beam', 'metal', ['Двутавр', 'Қоставр', 'I-beam'], 'm', [
    '20Б1',
    '25Б1',
    '30Б1',
    '35Б1',
  ]),
  entry(
    'profile-pipe',
    'metal',
    ['Труба профильная', 'Профильді құбыр', 'Box section'],
    'm',
    ['20×20×2 мм', '40×40×2 мм', '60×40×3 мм', '80×80×4 мм'],
  ),
  entry(
    'brick',
    'masonry',
    ['Кирпич керамический', 'Керамикалық кірпіш', 'Clay brick'],
    'pcs',
    ['М100 · 250×120×65 мм', 'М150 · 250×120×65 мм', 'М200 · 250×120×65 мм'],
  ),
  entry(
    'facing-brick',
    'masonry',
    ['Кирпич облицовочный', 'Қаптама кірпіш', 'Facing brick'],
    'pcs',
    ['250×120×65 мм', '250×120×88 мм'],
  ),
  entry('aac-block', 'masonry', ['Газоблок', 'Газоблок', 'AAC block'], 'm3', [
    'D400 · 100 мм',
    'D400 · 200 мм',
    'D500 · 200 мм',
    'D500 · 300 мм',
    'D600 · 400 мм',
  ]),
  entry(
    'clay-block',
    'masonry',
    ['Керамоблок', 'Керамоблок', 'Clay block'],
    'pcs',
    ['250 мм', '380 мм', '440 мм', '510 мм'],
  ),
  entry(
    'partition-block',
    'masonry',
    ['Пазогребневая плита', 'Пазды плита', 'Gypsum partition block'],
    'm2',
    ['80 мм', '100 мм'],
  ),
  entry('cement', 'aggregates', ['Цемент', 'Цемент', 'Cement'], 'bag', [
    'М400 · 50 кг',
    'М500 · 50 кг',
    'ЦЕМ I 42,5Н · 50 кг',
    'ЦЕМ II 32,5Н · 25 кг',
  ]),
  entry('sand', 'aggregates', ['Песок', 'Құм', 'Sand'], 'm3', [
    '0–2 мм',
    '0–5 мм',
  ]),
  entry(
    'gravel',
    'aggregates',
    ['Щебень', 'Қиыршық тас', 'Crushed stone'],
    'm3',
    ['5–10 мм', '5–20 мм', '20–40 мм', '40–70 мм'],
  ),
  entry(
    'clay-aggregate',
    'aggregates',
    ['Керамзит', 'Керамзит', 'Expanded clay'],
    'm3',
    ['5–10 мм', '10–20 мм', '20–40 мм'],
  ),
  entry(
    'dry-mix',
    'aggregates',
    ['Пескобетон', 'Құмбетон', 'Sand concrete mix'],
    'bag',
    ['М150 · 25 кг', 'М200 · 25 кг', 'М300 · 40 кг'],
  ),
  entry(
    'mineral-wool',
    'insulation',
    ['Минеральная вата', 'Минералды мақта', 'Mineral wool'],
    'm3',
    ['50 мм', '100 мм', '150 мм', '200 мм'],
  ),
  entry(
    'xps',
    'insulation',
    [
      'Экструдированный пенополистирол',
      'Экструдталған полистирол',
      'XPS insulation',
    ],
    'm3',
    ['30 мм', '50 мм', '80 мм', '100 мм'],
  ),
  entry(
    'eps',
    'insulation',
    ['Пенополистирол', 'Пенополистирол', 'EPS insulation'],
    'm3',
    ['ППС 16Ф · 50 мм', 'ППС 16Ф · 100 мм', 'ППС 25 · 100 мм'],
  ),
  entry(
    'waterproof-membrane',
    'insulation',
    [
      'Гидроизоляционная мембрана',
      'Гидрооқшаулау мембранасы',
      'Waterproof membrane',
    ],
    'm2',
    ['PVC · 1,2 мм', 'PVC · 1,5 мм', 'TPO · 1,5 мм', 'EPDM · 1,2 мм'],
  ),
  entry(
    'vapour-barrier',
    'insulation',
    ['Пароизоляция', 'Бу оқшаулағыш', 'Vapour barrier'],
    'roll',
  ),
  entry(
    'bitumen',
    'insulation',
    ['Битумная мастика', 'Битум мастикасы', 'Bitumen mastic'],
    'kg',
  ),
  entry('sealant', 'insulation', ['Герметик', 'Герметик', 'Sealant'], 'pcs', [
    '280 мл',
    '310 мл',
    '600 мл',
  ]),
  entry(
    'roof-sheet',
    'roof',
    ['Профнастил', 'Профильді төсем', 'Profiled roofing sheet'],
    'm2',
    ['С8 · 0,45 мм', 'С21 · 0,5 мм', 'НС35 · 0,5 мм', 'Н60 · 0,7 мм'],
  ),
  entry(
    'metal-tile',
    'roof',
    ['Металлочерепица', 'Металл жабынқыш', 'Metal roof tile'],
    'm2',
    ['0,45 мм', '0,5 мм'],
  ),
  entry(
    'roll-roofing',
    'roof',
    ['Рулонная кровля', 'Орам шатыр жабыны', 'Bitumen roofing'],
    'roll',
    ['ХПП', 'ХКП', 'ТПП', 'ТКП'],
  ),
  entry('gutter', 'roof', ['Водосток', 'Суағар', 'Rainwater gutter'], 'm', [
    'Ø100 мм',
    'Ø125 мм',
    'Ø150 мм',
  ]),
  entry(
    'facade-panel',
    'roof',
    ['Фасадная панель', 'Қасбет панелі', 'Facade panel'],
    'm2',
  ),
  entry(
    'plank',
    'timber',
    ['Доска обрезная', 'Жиектелген тақтай', 'Sawn board'],
    'm3',
    ['25×100 мм', '40×150 мм', '50×150 мм', '50×200 мм'],
  ),
  entry('timber-beam', 'timber', ['Брус', 'Білеу', 'Timber beam'], 'm3', [
    '50×50 мм',
    '100×100 мм',
    '150×150 мм',
    '200×200 мм',
  ]),
  entry('plywood', 'timber', ['Фанера', 'Фанера', 'Plywood'], 'm2', [
    '9 мм',
    '12 мм',
    '18 мм',
    '21 мм',
  ]),
  entry('osb', 'timber', ['ОСП-плита', 'OSB тақтасы', 'OSB board'], 'm2', [
    '9 мм',
    '12 мм',
    '15 мм',
    '18 мм',
  ]),
  entry(
    'formwork',
    'timber',
    ['Щит опалубки', 'Қалып қалқаны', 'Formwork panel'],
    'm2',
  ),
  entry(
    'drywall',
    'finishing',
    ['Гипсокартон', 'Гипсокартон', 'Plasterboard'],
    'm2',
    ['ГКЛ · 9,5 мм', 'ГКЛ · 12,5 мм', 'ГКЛВ · 12,5 мм', 'ГКЛО · 12,5 мм'],
  ),
  entry(
    'drywall-profile',
    'finishing',
    ['Профиль для гипсокартона', 'Гипсокартон профилі', 'Drywall profile'],
    'm',
    ['ПП 60×27 мм', 'ПН 28×27 мм', 'ПС 50×50 мм', 'ПС 75×50 мм'],
  ),
  entry('plaster', 'finishing', ['Штукатурка', 'Сылақ', 'Plaster'], 'bag', [
    '25 кг',
    '30 кг',
  ]),
  entry(
    'putty',
    'finishing',
    ['Шпаклёвка', 'Тегістегіш қоспа', 'Filler'],
    'bag',
    ['5 кг', '20 кг', '25 кг'],
  ),
  entry('primer', 'finishing', ['Грунтовка', 'Астар', 'Primer'], 'l', [
    '5 л',
    '10 л',
  ]),
  entry('paint', 'finishing', ['Краска', 'Бояу', 'Paint'], 'l', [
    '2,5 л',
    '5 л',
    '10 л',
  ]),
  entry(
    'tile',
    'finishing',
    ['Керамическая плитка', 'Керамикалық тақта', 'Ceramic tile'],
    'm2',
    ['300×300 мм', '300×600 мм', '600×600 мм'],
  ),
  entry(
    'porcelain',
    'finishing',
    ['Керамогранит', 'Керамогранит', 'Porcelain tile'],
    'm2',
    ['600×600 мм', '600×1200 мм', '1200×1200 мм'],
  ),
  entry(
    'tile-adhesive',
    'finishing',
    ['Клей плиточный', 'Тақта желімі', 'Tile adhesive'],
    'bag',
    ['C0 · 25 кг', 'C1 · 25 кг', 'C2 · 25 кг'],
  ),
  entry('floor', 'finishing', ['Ламинат', 'Ламинат', 'Laminate floor'], 'm2', [
    '32 · 8 мм',
    '33 · 10 мм',
    '34 · 12 мм',
  ]),
  entry(
    'skirting',
    'finishing',
    ['Плинтус', 'Еден ернеулігі', 'Skirting board'],
    'm',
  ),
  entry(
    'cable',
    'electrical',
    ['Кабель силовой', 'Күштік кабель', 'Power cable'],
    'm',
    [
      'ВВГнг-LS 3×1,5',
      'ВВГнг-LS 3×2,5',
      'ВВГнг-LS 3×4',
      'ВВГнг-LS 5×6',
      'ВВГнг-LS 5×10',
    ],
  ),
  entry(
    'conduit',
    'electrical',
    ['Гофротруба', 'Гофр құбыр', 'Cable conduit'],
    'm',
    ['Ø16 мм', 'Ø20 мм', 'Ø25 мм', 'Ø32 мм'],
  ),
  entry(
    'cable-tray',
    'electrical',
    ['Кабельный лоток', 'Кабель науасы', 'Cable tray'],
    'm',
    ['50×50 мм', '100×50 мм', '200×50 мм', '300×80 мм'],
  ),
  entry(
    'breaker',
    'electrical',
    ['Автоматический выключатель', 'Автоматты ажыратқыш', 'Circuit breaker'],
    'pcs',
    ['1P · 16 A', '1P · 25 A', '1P · 32 A', '3P · 32 A', '3P · 63 A'],
  ),
  entry('socket', 'electrical', ['Розетка', 'Розетка', 'Socket outlet'], 'pcs'),
  entry(
    'switch',
    'electrical',
    ['Выключатель', 'Ажыратқыш', 'Light switch'],
    'pcs',
  ),
  entry('luminaire', 'electrical', ['Светильник', 'Шам', 'Luminaire'], 'pcs', [
    'LED · 18 W',
    'LED · 36 W',
    'LED · 48 W',
  ]),
  entry(
    'panel',
    'electrical',
    ['Электрощит', 'Электр қалқаны', 'Distribution board'],
    'pcs',
    ['12', '24', '36', '54'],
  ),
  entry(
    'ppr-pipe',
    'plumbing',
    ['Труба полипропиленовая', 'Полипропилен құбыр', 'PPR pipe'],
    'm',
    ['Ø20 мм', 'Ø25 мм', 'Ø32 мм', 'Ø40 мм', 'Ø50 мм', 'Ø63 мм'],
  ),
  entry('pex-pipe', 'plumbing', ['Труба PEX', 'PEX құбыры', 'PEX pipe'], 'm', [
    'Ø16 мм',
    'Ø20 мм',
    'Ø25 мм',
    'Ø32 мм',
  ]),
  entry(
    'sewer-pipe',
    'plumbing',
    ['Труба канализационная', 'Кәріз құбыры', 'Drainage pipe'],
    'm',
    ['Ø50 мм', 'Ø110 мм', 'Ø160 мм', 'Ø200 мм'],
  ),
  entry('fitting', 'plumbing', ['Фитинг', 'Фитинг', 'Pipe fitting'], 'pcs', [
    'Ø20 мм',
    'Ø25 мм',
    'Ø32 мм',
    'Ø50 мм',
    'Ø110 мм',
  ]),
  entry(
    'valve',
    'plumbing',
    ['Кран шаровой', 'Шарлы кран', 'Ball valve'],
    'pcs',
    ['DN15', 'DN20', 'DN25', 'DN32', 'DN50'],
  ),
  entry(
    'radiator',
    'plumbing',
    ['Радиатор отопления', 'Жылыту радиаторы', 'Radiator'],
    'pcs',
    ['500×80 мм', '500×100 мм', '22 · 500×1000 мм'],
  ),
  entry(
    'pipe-insulation',
    'plumbing',
    ['Теплоизоляция труб', 'Құбыр жылуоқшаулағышы', 'Pipe insulation'],
    'm',
    ['Ø20×9 мм', 'Ø25×9 мм', 'Ø32×13 мм', 'Ø50×13 мм'],
  ),
  entry('duct', 'ventilation', ['Воздуховод', 'Ауа құбыры', 'Air duct'], 'm', [
    'Ø100 мм',
    'Ø125 мм',
    'Ø160 мм',
    'Ø200 мм',
    'Ø250 мм',
    '400×200 мм',
  ]),
  entry(
    'vent-grille',
    'ventilation',
    ['Вентиляционная решётка', 'Желдету торы', 'Ventilation grille'],
    'pcs',
    ['150×150 мм', '200×200 мм', '300×150 мм'],
  ),
  entry(
    'fan',
    'ventilation',
    ['Вентилятор', 'Желдеткіш', 'Ventilation fan'],
    'pcs',
    ['Ø100 мм', 'Ø125 мм', 'Ø160 мм', 'Ø200 мм'],
  ),
  entry(
    'screw',
    'fixings',
    ['Саморез', 'Бұранда', 'Self-tapping screw'],
    'pack',
    ['3,5×25 мм', '3,5×35 мм', '4,2×16 мм', '4,8×35 мм'],
  ),
  entry('anchor', 'fixings', ['Анкер', 'Анкер', 'Anchor bolt'], 'pcs', [
    'М8×80 мм',
    'М10×100 мм',
    'М12×120 мм',
    'М16×150 мм',
  ]),
  entry('dowel', 'fixings', ['Дюбель', 'Дюбель', 'Wall plug'], 'pack', [
    '6×40 мм',
    '8×60 мм',
    '10×100 мм',
  ]),
  entry('nails', 'fixings', ['Гвозди', 'Шеге', 'Nails'], 'kg', [
    '2,5×50 мм',
    '3×70 мм',
    '4×100 мм',
  ]),
  entry(
    'foam',
    'fixings',
    ['Пена монтажная', 'Монтаж көбігі', 'Expanding foam'],
    'pcs',
    ['500 мл', '750 мл'],
  ),
  entry(
    'disc',
    'fixings',
    ['Диск отрезной', 'Кесу дискісі', 'Cutting disc'],
    'pcs',
    ['Ø125 мм', 'Ø180 мм', 'Ø230 мм'],
  ),
  entry(
    'tape',
    'fixings',
    ['Лента монтажная', 'Монтаж таспасы', 'Construction tape'],
    'roll',
  ),
  entry(
    'geotextile',
    'landscape',
    ['Геотекстиль', 'Геотекстиль', 'Geotextile'],
    'm2',
    ['150 г/м²', '200 г/м²', '300 г/м²', '400 г/м²'],
  ),
  entry(
    'paving',
    'landscape',
    ['Тротуарная плитка', 'Тротуар тақтасы', 'Paving block'],
    'm2',
    ['40 мм', '60 мм', '80 мм'],
  ),
  entry('kerb', 'landscape', ['Бордюр', 'Жиектас', 'Kerb'], 'pcs', [
    'БР 100.20.8',
    'БР 100.30.15',
  ]),
  entry(
    'asphalt',
    'landscape',
    ['Асфальтобетон', 'Асфальтбетон', 'Asphalt concrete'],
    't',
  ),
  entry(
    'topsoil',
    'landscape',
    ['Растительный грунт', 'Өсімдік топырағы', 'Topsoil'],
    'm3',
  ),
];
export const materialVariantLabel = (value: string, locale: MaterialLocale) =>
  locale === 'en'
    ? value
        .replaceAll('мм', 'mm')
        .replaceAll('мл', 'mL')
        .replaceAll('кг', 'kg')
        .replaceAll('г/м²', 'g/m²')
        .replaceAll(' л', ' L')
    : value;
export function unitLabel(unit: string, locale: MaterialLocale) {
  const found = materialUnits.find((item) => item.id === unit);
  return found ? localized(found.labels, locale) : unit;
}
export function materialRequestLabel(
  item: { name: string; materialId?: string; specification?: string },
  locale: MaterialLocale,
) {
  const found = materialCatalog.find(
    (material) => material.id === item.materialId,
  );
  return [
    found ? localized(found.labels, locale) : item.name,
    item.specification ? materialVariantLabel(item.specification, locale) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
export function resolveMaterialSelection(values: {
  materialId?: string;
  variant?: string;
  customName?: string;
  customVariant?: string;
  unit?: string;
  customUnit?: string;
}) {
  const found = materialCatalog.find((item) => item.id === values.materialId);
  if (!found && values.materialId !== 'other')
    throw new Error('Unknown material');
  const name = found ? found.labels[0] : (values.customName?.trim() ?? '');
  if (name.length < 2 || name.length > 200)
    throw new Error('Invalid material name');
  const specification =
    values.variant === 'other'
      ? (values.customVariant?.trim() ?? '')
      : (values.variant ?? '');
  if (
    specification.length > 120 ||
    (values.variant === 'other' && !specification) ||
    (found &&
      values.variant &&
      values.variant !== 'other' &&
      !found.variants.includes(values.variant))
  )
    throw new Error('Invalid specification');
  if (found?.variants.length && !values.variant)
    throw new Error('Specification required');
  const unit =
    values.unit === 'other'
      ? (values.customUnit?.trim() ?? '')
      : (values.unit ?? '');
  if (
    !unit ||
    unit.length > 30 ||
    (values.unit !== 'other' && !materialUnits.some((item) => item.id === unit))
  )
    throw new Error('Invalid unit');
  return {
    ...(found ? { materialId: found.id } : {}),
    name,
    specification,
    unit,
  };
}
