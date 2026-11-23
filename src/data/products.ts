import { t, tx, type L } from '../i18n';

export type CurtainType = 'classic' | 'tulle' | 'roller' | 'zebra';

export interface CurtainColor {
  name: L;
  /** Base colour. The fabric texture is multiplied by it, so use the brightest tone of the fabric. */
  hex: string;
}

export interface Product {
  id: string;
  name: L;
  type: CurtainType;
  fabric: L;
  description: L;
  /** Interior photo for the card. Without it the card shows the tinted fabric itself. */
  image?: string;
  /**
   * Photo texture of the real fabric (flat, front-on, tiling vertically; alpha = opacity:
   * opaque bands 255, sheer bands lower). Used by the renderer and for swatches.
   */
  texture?: string;
  colors: CurtainColor[];
  /** Price in so'm per metre. `null` shows "price on request". */
  price: number | null;
  popular?: boolean;
}

const img = (name: string) => `images/${name}`;
const c = (uz: string, ru: string, hex: string): CurtainColor => ({ name: { uz, ru }, hex });

export const PRODUCTS: Product[] = [
  {
    id: 'zebra-damask',
    name: { uz: 'Zebra Damask', ru: 'Зебра Дамаск' },
    type: 'zebra',
    fabric: { uz: 'Kun-tun', ru: 'День-ночь' },
    description: {
      uz: 'Ikki qavatli kun-tun rulonli parda: shaffof va qalin chiziqlar siljib, yorugʻlikni xohlagancha boshqaradi. Damask naqsh.',
      ru: 'Двухслойная рулонная штора «день-ночь»: прозрачные и плотные полосы сдвигаются и регулируют свет. Узор дамаск.',
    },
    image: img('p_zebra.webp'),
    texture: img('zebra_damask.webp'),
    colors: [c('Kumush-qora', 'Серебро с чёрным', '#FFFFFF'), c('Krem', 'Кремовый', '#F7E6C4'), c('Moviy', 'Голубой', '#D3E0F2')],
    price: null,
    popular: true,
  },
  {
    id: 'barxat',
    name: { uz: 'Barxat', ru: 'Бархат' },
    type: 'classic',
    fabric: { uz: 'Barxat', ru: 'Бархат' },
    description: {
      uz: 'Ogʻir, yumshoq barxat. Chuqur burmalar va boy rang xonaga hashamat qoʻshadi.',
      ru: 'Плотный мягкий бархат. Глубокие складки и насыщенный цвет добавляют комнате роскоши.',
    },
    colors: [
      c('Bordo', 'Бордовый', '#A3283F'),
      c('Zumrad', 'Изумрудный', '#23806A'),
      c('Toʻq koʻk', 'Тёмно-синий', '#3A4F8C'),
      c('Grafit', 'Графит', '#7A808C'),
      c('Bej', 'Бежевый', '#E3D2B0'),
    ],
    price: null,
    popular: true,
  },
  {
    id: 'blackout-antrasit',
    name: { uz: 'Blackout Antrasit', ru: 'Блэкаут Антрацит' },
    type: 'classic',
    fabric: { uz: 'Blackout', ru: 'Блэкаут' },
    description: {
      uz: 'Yorugʻlikni deyarli toʻliq toʻsadi. Yotoqxona va kinozal uchun ideal.',
      ru: 'Почти полностью блокирует свет. Идеально для спальни и домашнего кинотеатра.',
    },
    image: img('p_qora.webp'),
    colors: [c('Antrasit', 'Антрацит', '#4A4F58'), c('Qora', 'Чёрный', '#2E3036'), c('Kumush', 'Серебристый', '#A9ADB4')],
    price: null,
    popular: true,
  },
  {
    id: 'tyul-krem',
    name: { uz: 'Tyul Krem', ru: 'Тюль Крем' },
    type: 'tulle',
    fabric: { uz: 'Voal', ru: 'Вуаль' },
    description: {
      uz: 'Yengil, havodor tyul. Kunduzgi yorugʻlikni yumshoq tarqatadi.',
      ru: 'Лёгкий воздушный тюль. Мягко рассеивает дневной свет.',
    },
    image: img('p_tyul.webp'),
    colors: [c('Krem', 'Кремовый', '#F4E9D2'), c('Oq', 'Белый', '#FFFFFF')],
    price: null,
    popular: true,
  },
  {
    id: 'zaytun-klassik',
    name: { uz: 'Klassik Zaytun', ru: 'Классика Олива' },
    type: 'classic',
    fabric: { uz: 'Kanvas', ru: 'Канвас' },
    description: {
      uz: 'Tabiiy zaytun rangli zich mato. Mehmonxona uchun iliq va sokin tanlov.',
      ru: 'Плотная ткань природного оливкового оттенка. Тёплый и спокойный выбор для гостиной.',
    },
    image: img('p_zaytun.webp'),
    colors: [c('Zaytun', 'Оливковый', '#7D8462'), c('Qum', 'Песочный', '#CDBB98'), c('Kulrang', 'Серый', '#8C9096')],
    price: null,
    popular: true,
  },
  {
    id: 'dimout-kok',
    name: { uz: 'Dimout Koʻk', ru: 'Димаут Синий' },
    type: 'classic',
    fabric: { uz: 'Dimout', ru: 'Димаут' },
    description: {
      uz: 'Yorugʻlikni qisman toʻsadi, xonani salqin va qorongʻiroq qiladi.',
      ru: 'Частично затемняет комнату и сохраняет прохладу.',
    },
    image: img('p_kok.webp'),
    colors: [c('Koʻk-kulrang', 'Серо-голубой', '#6A7891'), c('Dengiz', 'Морской', '#3C5577')],
    price: null,
  },
  {
    id: 'rulon',
    name: { uz: 'Rulonli parda', ru: 'Рулонная штора' },
    type: 'roller',
    fabric: { uz: 'Polyester', ru: 'Полиэстер' },
    description: {
      uz: 'Ixcham rulonli parda. Deraza romiga oʻrnatiladi, joy egallamaydi.',
      ru: 'Компактная рулонная штора. Крепится на раму и не занимает места.',
    },
    colors: [c('Oq', 'Белый', '#F2F0EB'), c('Bej', 'Бежевый', '#D9C9A8'), c('Grafit', 'Графит', '#6B7079')],
    price: null,
  },
];

export const findProduct = (id: string | undefined) => PRODUCTS.find((p) => p.id === id);

export const typeLabel = (type: CurtainType) => t().type[type];

export const formatPrice = (p: Product) =>
  p.price == null ? t().priceOnRequest : `${p.price.toLocaleString('ru-RU').replace(/,/g, ' ')} ${t().perMeter}`;

/** Text used for search, in both languages so either spelling matches. */
export const searchText = (p: Product) =>
  [p.name.uz, p.name.ru, p.fabric.uz, p.fabric.ru, t().type[p.type], ...p.colors.flatMap((x) => [x.name.uz, x.name.ru])]
    .join(' ')
    .toLowerCase();

export { tx };
