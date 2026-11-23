export type CurtainType = 'classic' | 'tulle' | 'roller';

export interface CurtainColor {
  name: string;
  /** Base colour. The fabric texture is multiplied by it, so use the brightest tone of the fabric. */
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  type: CurtainType;
  fabric: string;
  description: string;
  /** Interior photo for the card. Without it the card shows the tinted fabric itself. */
  image?: string;
  colors: CurtainColor[];
  /** Price in so'm per metre. `null` shows "narxi so'rov bo'yicha". */
  price: number | null;
  popular?: boolean;
}

export const TYPE_LABEL: Record<CurtainType, string> = {
  classic: 'Klassik',
  tulle: 'Tyul',
  roller: 'Rulonli',
};

const img = (name: string) => `images/${name}`;

export const PRODUCTS: Product[] = [
  {
    id: 'barxat',
    name: 'Barxat',
    type: 'classic',
    fabric: 'Barxat',
    description: 'Ogʻir, yumshoq barxat. Chuqur burmalar va boy rang xonaga hashamat qoʻshadi.',
    colors: [
      { name: 'Bordo', hex: '#A3283F' },
      { name: 'Zumrad', hex: '#23806A' },
      { name: 'Toʻq koʻk', hex: '#3A4F8C' },
      { name: 'Grafit', hex: '#7A808C' },
      { name: 'Bej', hex: '#E3D2B0' },
    ],
    price: null,
    popular: true,
  },
  {
    id: 'blackout-antrasit',
    name: 'Blackout Antrasit',
    type: 'classic',
    fabric: 'Blackout',
    description: 'Yorugʻlikni deyarli toʻliq toʻsadi. Yotoqxona va kinozal uchun ideal.',
    image: img('p_qora.webp'),
    colors: [
      { name: 'Antrasit', hex: '#4A4F58' },
      { name: 'Qora', hex: '#2E3036' },
      { name: 'Kumush', hex: '#A9ADB4' },
    ],
    price: null,
    popular: true,
  },
  {
    id: 'tyul-krem',
    name: 'Tyul Krem',
    type: 'tulle',
    fabric: 'Voal',
    description: 'Yengil, havodor tyul. Kunduzgi yorugʻlikni yumshoq tarqatadi.',
    image: img('p_tyul.webp'),
    colors: [
      { name: 'Krem', hex: '#F4E9D2' },
      { name: 'Oq', hex: '#FFFFFF' },
    ],
    price: null,
    popular: true,
  },
  {
    id: 'zaytun-klassik',
    name: 'Klassik Zaytun',
    type: 'classic',
    fabric: 'Kanvas',
    description: 'Tabiiy zaytun rangli zich mato. Mehmonxona uchun iliq va sokin tanlov.',
    image: img('p_zaytun.webp'),
    colors: [
      { name: 'Zaytun', hex: '#7D8462' },
      { name: 'Qum', hex: '#CDBB98' },
      { name: 'Kulrang', hex: '#8C9096' },
    ],
    price: null,
    popular: true,
  },
  {
    id: 'dimout-kok',
    name: 'Dimout Koʻk',
    type: 'classic',
    fabric: 'Dimout',
    description: 'Yorugʻlikni qisman toʻsadi, xonani salqin va qorongʻiroq qiladi.',
    image: img('p_kok.webp'),
    colors: [
      { name: 'Koʻk-kulrang', hex: '#6A7891' },
      { name: 'Dengiz', hex: '#3C5577' },
    ],
    price: null,
  },
  {
    id: 'rulon',
    name: 'Rulonli parda',
    type: 'roller',
    fabric: 'Polyester',
    description: 'Ixcham rulonli parda. Deraza romiga oʻrnatiladi, joy egallamaydi.',
    colors: [
      { name: 'Oq', hex: '#F2F0EB' },
      { name: 'Bej', hex: '#D9C9A8' },
      { name: 'Grafit', hex: '#6B7079' },
    ],
    price: null,
  },
];

export const findProduct = (id: string | undefined) => PRODUCTS.find((p) => p.id === id);

export const formatPrice = (p: Product) =>
  p.price == null ? 'Narxi soʻrov boʻyicha' : `${p.price.toLocaleString('ru-RU').replace(/,/g, ' ')} soʻm / m`;
