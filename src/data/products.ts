import { t, tx, type L } from '../i18n';

export type CurtainType = 'classic' | 'tulle' | 'roller' | 'zebra' | 'roman' | 'venetian' | 'vertical' | 'pleated';

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
  /** Tileable woven pattern (jacquard, linen, ikat…), tinted by the colour and drawn on the 3D fabric. */
  pattern?: string;
  colors: CurtainColor[];
  /** How the cloth reflects light in 3D: velvet has a soft sheen, satin a smoother shine, matte none. */
  finish?: 'velvet' | 'satin' | 'matte' | 'wood' | 'metal';
  /** Price in so'm per metre. `null` shows "price on request". */
  price: number | null;
  popular?: boolean;
}

const img = (name: string) => `images/${name}`;
const c = (uz: string, ru: string, hex: string): CurtainColor => ({ name: { uz, ru }, hex });
const pat = (name: string) => img(`patterns/${name.includes('.') ? name : `${name}.webp`}`);

export const PRODUCTS: Product[] = [
  {
    id: 'jalyuzi-yogoch',
    name: { uz: 'Yogʻoch jalyuzi', ru: 'Деревянные жалюзи' },
    type: 'venetian',
    finish: 'wood',
    fabric: { uz: 'Yogʻoch plankalar, 50 mm', ru: 'Деревянные ламели, 50 мм' },
    description: {
      uz: 'Gorizontal yogʻoch plankalar: burib yorugʻlikni sozlaysiz, toʻliq koʻtarib derazani ochasiz. Iliq, premium koʻrinish.',
      ru: 'Горизонтальные деревянные ламели: поворотом регулируете свет, поднимаете — окно открыто. Тёплый премиальный вид.',
    },
    colors: [c('Yongʻoq', 'Орех', '#8A6440'), c('Tik', 'Тик', '#A97545'), c('Oq', 'Белый', '#F2EEE6'), c('Venge', 'Венге', '#4B3A2E')],
    price: null,
    popular: true,
  },
  {
    id: 'dikey',
    name: { uz: 'Dikey jalyuzi', ru: 'Вертикальные жалюзи' },
    type: 'vertical',
    fabric: { uz: 'Mato lamellar, 89 mm', ru: 'Тканевые ламели, 89 мм' },
    description: {
      uz: 'Vertikal mato lamellar: burib yorugʻlikni boshqarasiz, bir tomonga yigʻib derazani ochasiz. Katta derazalar va ofislar uchun.',
      ru: 'Вертикальные тканевые ламели: поворотом регулируете свет, сдвигаете в сторону — окно открыто. Для больших окон и офисов.',
    },
    colors: [c('Oq', 'Белый', '#F3F1EC'), c('Krem', 'Кремовый', '#EADBC0'), c('Kulrang', 'Серый', '#A3A7AD'), c('Moviy', 'Голубой', '#9FB4CF')],
    price: null,
    popular: true,
  },
  {
    id: 'plise',
    name: { uz: 'Plise (garmoshka)', ru: 'Плиссе (гармошка)' },
    type: 'pleated',
    fabric: { uz: 'Burmali mato', ru: 'Плиссированная ткань' },
    description: {
      uz: 'Garmoshka kabi buklangan mato deraza romiga oʻrnatiladi: yuqoriga yigʻiladi va yorugʻlikni yumshoq tarqatadi. Har qanday derazaga mos.',
      ru: 'Сложенная гармошкой ткань крепится на раму: собирается вверх и мягко рассеивает свет. Подходит для любых окон.',
    },
    colors: [c('Oq', 'Белый', '#F4F2EC'), c('Qum', 'Песочный', '#D9C7A3'), c('Kulrang', 'Серый', '#9EA2A8'), c('Pudra', 'Пудровый', '#E6C9C2')],
    price: null,
    popular: true,
  },
  {
    id: 'jalyuzi-alyuminiy',
    name: { uz: 'Alyuminiy jalyuzi', ru: 'Алюминиевые жалюзи' },
    type: 'venetian',
    finish: 'metal',
    fabric: { uz: 'Alyuminiy plankalar, 25 mm', ru: 'Алюминиевые ламели, 25 мм' },
    description: {
      uz: 'Yupqa alyuminiy plankalar namlikdan qoʻrqmaydi — oshxona va ofis uchun qulay.',
      ru: 'Тонкие алюминиевые ламели не боятся влаги — удобно для кухни и офиса.',
    },
    colors: [c('Oq', 'Белый', '#F1F1EF'), c('Kumush', 'Серебро', '#C9CDD3'), c('Antrasit', 'Антрацит', '#4A4F58'), c('Bej', 'Бежевый', '#D8C8A8')],
    price: null,
  },
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
    finish: 'velvet',
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
    finish: 'satin',
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
    finish: 'matte',
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
    finish: 'satin',
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
  {
    id: 'jakkard-sharq',
    name: { uz: 'Jakkard «Sharq»', ru: 'Жаккард «Восток»' },
    type: 'classic',
    finish: 'satin',
    pattern: pat('damask'),
    fabric: { uz: 'Jakkard, medalyon naqsh', ru: 'Жаккард, медальонный узор' },
    description: {
      uz: 'Yaltiroq medalyon naqshli zich jakkard: mehmonxona va zal uchun tantanali, boy koʻrinish.',
      ru: 'Плотный жаккард с блестящим медальонным узором: торжественный, богатый вид для гостиной и зала.',
    },
    colors: [c('Oltin', 'Золото', '#E3C88A'), c('Bordo', 'Бордо', '#8E2F3A'), c('Zumrad', 'Изумруд', '#2F6B57'), c('Shampan', 'Шампань', '#EADCC2')],
    price: null,
    popular: true,
  },
  {
    id: 'adras-ikat',
    name: { uz: 'Adras naqshli parda', ru: 'Штора с узором адрас' },
    type: 'classic',
    finish: 'matte',
    pattern: pat('ikat'),
    fabric: { uz: 'Ikat (adras) naqshli mato', ru: 'Ткань с узором икат (адрас)' },
    description: {
      uz: 'Oʻzbek adrasidan ilhomlangan ikat naqsh: milliy ruh va zamonaviy interyer uygʻunligi.',
      ru: 'Узор икат, вдохновлённый узбекским адрасом: национальный дух в современном интерьере.',
    },
    colors: [c('Feruza', 'Бирюза', '#3D8C95'), c('Anor', 'Гранат', '#A8323E'), c('Indigo', 'Индиго', '#3B4A82'), c('Qum', 'Песок', '#D8C29A')],
    price: null,
    popular: true,
  },
  {
    id: 'zigir-tabiiy',
    name: { uz: 'Zigʻir parda', ru: 'Льняная штора' },
    type: 'classic',
    finish: 'matte',
    pattern: pat('linen'),
    fabric: { uz: 'Zigʻir (len) effekti', ru: 'Ткань под лён' },
    description: {
      uz: 'Tabiiy zigʻir toʻqimasi: yumshoq burmalar, yengil va issiq uy kayfiyati.',
      ru: 'Фактура натурального льна: мягкие складки, лёгкое и уютное настроение.',
    },
    colors: [c('Tabiiy', 'Натуральный', '#D9CBB0'), c('Oq', 'Белый', '#F1ECE2'), c('Zaytun', 'Олива', '#8F8C6A'), c('Grafit', 'Графит', '#5B5D60')],
    price: null,
  },
  {
    id: 'shenill',
    name: { uz: 'Shenill parda', ru: 'Штора из шенилла' },
    type: 'classic',
    finish: 'velvet',
    pattern: pat('chenille'),
    fabric: { uz: 'Shenill, yumshoq tukli', ru: 'Шенилл, мягкий ворс' },
    description: {
      uz: 'Mayin tukli shenill: barxatga oʻxshash yumshoq yaltirash, xonani issiq va jim qiladi.',
      ru: 'Мягкий ворсистый шенилл: бархатистый блеск, в комнате тепло и тихо.',
    },
    colors: [c('Kapuchino', 'Капучино', '#A88C74'), c('Moviy-kulrang', 'Серо-голубой', '#6E8193'), c('Terrakota', 'Терракота', '#B0644A'), c('Kulrang', 'Серый', '#8C8C8C')],
    price: null,
  },
  {
    id: 'chiziqli',
    name: { uz: 'Chiziqli parda', ru: 'Штора в полоску' },
    type: 'classic',
    finish: 'matte',
    pattern: pat('stripes'),
    fabric: { uz: 'Vertikal chiziqlar', ru: 'Вертикальные полосы' },
    description: {
      uz: 'Vertikal chiziqlar shiftni balandroq koʻrsatadi: kabinet va yotoqxona uchun qatʼiy, toza uslub.',
      ru: 'Вертикальные полосы зрительно поднимают потолок: строгий, чистый стиль для кабинета и спальни.',
    },
    colors: [c('Bej', 'Бежевый', '#DCCBB0'), c('Kulrang', 'Серый', '#B5B8BC'), c('Moviy', 'Голубой', '#9DB0C8')],
    price: null,
  },
  {
    id: 'marokash',
    name: { uz: 'Marokash naqshi', ru: 'Марокканский узор' },
    type: 'classic',
    finish: 'satin',
    pattern: pat('trellis'),
    fabric: { uz: 'Geometrik naqsh, atlas', ru: 'Геометрический узор, атлас' },
    description: {
      uz: 'Nozik geometrik toʻr naqsh va yengil yaltirash: zamonaviy va sharqona interyerlarga mos.',
      ru: 'Тонкий геометрический узор-решётка и лёгкий блеск: подходит к современным и восточным интерьерам.',
    },
    colors: [c('Krem', 'Кремовый', '#EFE4CF'), c('Yalpiz', 'Мятный', '#BFD8CC'), c('Pushti', 'Розовый', '#E2C2BD')],
    price: null,
  },
  {
    id: 'bahor-gullari',
    name: { uz: 'Bahor gullari', ru: 'Весенние цветы' },
    type: 'classic',
    finish: 'matte',
    pattern: pat('floral'),
    fabric: { uz: 'Gulli naqsh', ru: 'Цветочный узор' },
    description: {
      uz: 'Mayin gulli naqsh: yotoqxona va bolalar xonasi uchun yorugʻ, quvnoq kayfiyat.',
      ru: 'Нежный цветочный узор: светлое, весёлое настроение для спальни и детской.',
    },
    colors: [c('Oq', 'Белый', '#F3EFE8'), c('Pushti', 'Розовый', '#F0CFCF'), c('Yashil', 'Зелёный', '#CFE0C4')],
    price: null,
  },
  {
    id: 'atlas',
    name: { uz: 'Atlas parda', ru: 'Атласная штора' },
    type: 'classic',
    finish: 'satin',
    fabric: { uz: 'Silliq atlas', ru: 'Гладкий атлас' },
    description: {
      uz: 'Silliq atlas mato yorugʻlikda tovlanadi: kechki interyer uchun nafis, klassik tanlov.',
      ru: 'Гладкий атлас переливается на свету: изысканная классика для вечернего интерьера.',
    },
    colors: [c('Shampan', 'Шампань', '#E8D7B5'), c('Kumush', 'Серебро', '#C9CCD1'), c('Bordo', 'Бордо', '#7C2533'), c('Zumrad', 'Изумруд', '#23594A')],
    price: null,
  },
  {
    id: 'blackout-melanj',
    name: { uz: 'Blackout melanj', ru: 'Блэкаут меланж' },
    type: 'classic',
    finish: 'matte',
    pattern: pat('melange'),
    fabric: { uz: 'Blackout, melanj toʻqima', ru: 'Блэкаут, меланжевая фактура' },
    description: {
      uz: 'Kunduzi ham xonani toʻliq qorongʻi qiladi; melanj toʻqima oddiy blackoutdan jonliroq koʻrinadi.',
      ru: 'Полностью затемняет комнату даже днём; меланжевая фактура смотрится живее обычного блэкаута.',
    },
    colors: [c('Grafit', 'Графит', '#4F5257'), c('Qumrang', 'Песочный', '#BBA98C'), c('Toʻq moviy', 'Тёмно-синий', '#2E3D57')],
    price: null,
  },
  {
    id: 'vual',
    name: { uz: 'Vual tyul', ru: 'Тюль вуаль' },
    type: 'tulle',
    fabric: { uz: 'Vual, shaffof', ru: 'Вуаль, прозрачная' },
    description: {
      uz: 'Yengil shaffof vual: kunduzi yorugʻlikni yumshoq tarqatadi, xonani havodor qiladi.',
      ru: 'Лёгкая прозрачная вуаль: мягко рассеивает дневной свет, комната становится воздушной.',
    },
    colors: [c('Oq', 'Белый', '#FFFFFF'), c('Sut', 'Молочный', '#F6F0E4'), c('Kulrang', 'Серый', '#DADBDC')],
    price: null,
  },
  {
    id: 'organza',
    name: { uz: 'Organza tyul', ru: 'Тюль органза' },
    type: 'tulle',
    fabric: { uz: 'Organza, yaltiroq', ru: 'Органза, с блеском' },
    description: {
      uz: 'Tovlanuvchi organza: bayramona yaltirash va yengillik, klassik pardalar bilan juda mos.',
      ru: 'Переливающаяся органза: праздничный блеск и лёгкость, отлично сочетается с классическими шторами.',
    },
    colors: [c('Oltin', 'Золото', '#F1E2B8'), c('Kumush', 'Серебро', '#E3E6EA'), c('Oq', 'Белый', '#FBFBFB')],
    price: null,
  },
  {
    id: 'grek-setka',
    name: { uz: 'Grek setka tyul', ru: 'Тюль «греческая сетка»' },
    type: 'tulle',
    fabric: { uz: 'Setka toʻqima', ru: 'Сеточное плетение' },
    description: {
      uz: 'Mustahkam setka toʻqimali tyul: koʻchadan pana qiladi, yorugʻlikni esa oʻtkazadi.',
      ru: 'Прочный тюль-сетка: скрывает от взглядов с улицы и пропускает свет.',
    },
    colors: [c('Krem', 'Кремовый', '#F2E8D5'), c('Oq', 'Белый', '#FAFAFA'), c('Kapuchino', 'Капучино', '#E1D2C0')],
    price: null,
  },
  {
    id: 'rim-zigir',
    name: { uz: 'Rim pardasi, zigʻir', ru: 'Римская штора, лён' },
    type: 'roman',
    finish: 'matte',
    pattern: pat('linen'),
    fabric: { uz: 'Zigʻir effekti', ru: 'Ткань под лён' },
    description: {
      uz: 'Koʻtarilganda yumshoq taxlamlarga yigʻiladi: oshxona, yotoqxona va kabinet uchun ixcham va chiroyli.',
      ru: 'При подъёме собирается мягкими складками: компактно и красиво для кухни, спальни и кабинета.',
    },
    colors: [c('Tabiiy', 'Натуральный', '#D8C9AE'), c('Oq', 'Белый', '#F2EEE6'), c('Kulrang', 'Серый', '#A8A49C'), c('Zaytun', 'Олива', '#8B8A66')],
    price: null,
    popular: true,
  },
  {
    id: 'rim-blackout',
    name: { uz: 'Rim pardasi, blackout', ru: 'Римская штора, блэкаут' },
    type: 'roman',
    finish: 'satin',
    fabric: { uz: 'Blackout', ru: 'Блэкаут' },
    description: {
      uz: 'Yorugʻlik oʻtkazmaydigan rim pardasi: yotoqxona va bolalar xonasi uchun chuqur uyqu.',
      ru: 'Римская штора, не пропускающая свет: крепкий сон в спальне и детской.',
    },
    colors: [c('Antrasit', 'Антрацит', '#4C5058'), c('Bej', 'Бежевый', '#CDBB9C'), c('Toʻq moviy', 'Тёмно-синий', '#2F3E5A'), c('Oq', 'Белый', '#EEEDEA')],
    price: null,
  },
  {
    id: 'rim-chiziqli',
    name: { uz: 'Rim pardasi, chiziqli', ru: 'Римская штора в полоску' },
    type: 'roman',
    finish: 'matte',
    pattern: pat('stripes'),
    fabric: { uz: 'Chiziqli mato', ru: 'Ткань в полоску' },
    description: {
      uz: 'Chiziqli rim pardasi: oshxona va bolalar xonasiga yorugʻ, tartibli koʻrinish beradi.',
      ru: 'Римская штора в полоску: светлый, аккуратный вид для кухни и детской.',
    },
    colors: [c('Moviy', 'Голубой', '#A9BCD3'), c('Bej', 'Бежевый', '#DCCBB0'), c('Yashil', 'Зелёный', '#B9C9AE')],
    price: null,
  },
  {
    id: 'rim-jakkard',
    name: { uz: 'Rim pardasi, jakkard', ru: 'Римская штора, жаккард' },
    type: 'roman',
    finish: 'satin',
    pattern: pat('damask'),
    fabric: { uz: 'Jakkard', ru: 'Жаккард' },
    description: {
      uz: 'Medalyon naqshli jakkard rim pardasi: klassik interyer uchun ixcham va hashamatli yechim.',
      ru: 'Римская штора из жаккарда с медальонами: компактная роскошь для классического интерьера.',
    },
    colors: [c('Shampan', 'Шампань', '#E6D6B4'), c('Bordo', 'Бордо', '#8A3040'), c('Kulrang', 'Серый', '#B9BCC0')],
    price: null,
  },
  {
    id: 'rulon-blackout',
    name: { uz: 'Rulon blackout', ru: 'Рулонная штора блэкаут' },
    type: 'roller',
    fabric: { uz: 'Blackout', ru: 'Блэкаут' },
    description: {
      uz: 'Yorugʻlikni toʻliq toʻsadigan rulon parda: deraza romiga oʻrnatiladi, joy egallamaydi.',
      ru: 'Рулонная штора, полностью блокирующая свет: крепится на раму и не занимает места.',
    },
    colors: [c('Oq', 'Белый', '#EEEEEC'), c('Bej', 'Бежевый', '#D3C3A5'), c('Kulrang', 'Серый', '#8E9297'), c('Qora', 'Чёрный', '#34363A')],
    price: null,
  },
  {
    id: 'rulon-bambuk',
    name: { uz: 'Bambuk rulon parda', ru: 'Бамбуковая рулонная штора' },
    type: 'roller',
    pattern: pat('bamboo'),
    fabric: { uz: 'Bambuk plankalar', ru: 'Бамбуковые планки' },
    description: {
      uz: 'Tabiiy bambuk koʻrinishidagi rulon parda: issiq, ekologik uslub, ayvon va oshxona uchun.',
      ru: 'Рулонная штора под натуральный бамбук: тёплый эко-стиль для веранды и кухни.',
    },
    colors: [c('Tabiiy', 'Натуральный', '#CDAE7A'), c('Asal', 'Медовый', '#B4864B'), c('Yongʻoq', 'Орех', '#7A5534')],
    price: null,
  },
  {
    id: 'rulon-zigzag',
    name: { uz: 'Rulon parda, zigzag', ru: 'Рулонная штора, зигзаг' },
    type: 'roller',
    pattern: pat('chevron'),
    fabric: { uz: 'Zigzag naqsh', ru: 'Узор зигзаг' },
    description: {
      uz: 'Zamonaviy zigzag naqshli rulon parda: oddiy derazaga uslub qoʻshadi.',
      ru: 'Рулонная штора с современным узором зигзаг: добавляет стиля обычному окну.',
    },
    colors: [c('Kulrang', 'Серый', '#BFC2C6'), c('Bej', 'Бежевый', '#DDCDB2'), c('Moviy', 'Голубой', '#A9BCD2')],
    price: null,
  },
  {
    id: 'rulon-zigir',
    name: { uz: 'Rulon parda, zigʻir', ru: 'Рулонная штора, лён' },
    type: 'roller',
    pattern: pat('linen'),
    fabric: { uz: 'Zigʻir effekti', ru: 'Ткань под лён' },
    description: {
      uz: 'Zigʻir toʻqimali rulon parda yorugʻlikni yumshoq tarqatadi: har qanday xonaga mos.',
      ru: 'Рулонная штора с фактурой льна мягко рассеивает свет: подходит для любой комнаты.',
    },
    colors: [c('Tabiiy', 'Натуральный', '#D7C8AC'), c('Oq', 'Белый', '#F2EDE4'), c('Grafit', 'Графит', '#66686B')],
    price: null,
  },
  {
    id: 'zebra-klassik',
    name: { uz: 'Zebra «kun-tun»', ru: 'Зебра «день-ночь»' },
    type: 'zebra',
    texture: pat('zebra_plain.webp'),
    fabric: { uz: 'Shaffof va zich chiziqlar', ru: 'Прозрачные и плотные полосы' },
    description: {
      uz: 'Ikki qatlamli zebra: chiziqlarni surib, yorugʻlikni kun va tun rejimiga oʻtkazasiz.',
      ru: 'Двухслойная зебра: сдвигая полосы, переключаете свет между режимами «день» и «ночь».',
    },
    colors: [c('Oq', 'Белый', '#F4F3F0'), c('Bej', 'Бежевый', '#DACAAE'), c('Kulrang', 'Серый', '#A6A9AE'), c('Kapuchino', 'Капучино', '#B49A7E')],
    price: null,
    popular: true,
  },
  {
    id: 'zebra-zigir',
    name: { uz: 'Zebra, zigʻir effekti', ru: 'Зебра под лён' },
    type: 'zebra',
    texture: pat('zebra_linen.webp'),
    fabric: { uz: 'Zigʻir toʻqimali chiziqlar', ru: 'Полосы с фактурой льна' },
    description: {
      uz: 'Zigʻir toʻqimali zich chiziqlar: kun-tun zebra, tabiiy va issiq koʻrinishda.',
      ru: 'Плотные полосы с фактурой льна: зебра «день-ночь» в натуральном тёплом виде.',
    },
    colors: [c('Qum', 'Песок', '#D8C6A4'), c('Oq', 'Белый', '#F0ECE4'), c('Grafit', 'Графит', '#63666A')],
    price: null,
  },
  {
    id: 'jalyuzi-bambuk',
    name: { uz: 'Bambuk jalyuzi', ru: 'Бамбуковые жалюзи' },
    type: 'venetian',
    finish: 'wood',
    fabric: { uz: 'Bambuk plankalar, 50 mm', ru: 'Бамбуковые ламели, 50 мм' },
    description: {
      uz: 'Bambuk plankali gorizontal jalyuzi: yengil, mustahkam va tabiiy issiq rang.',
      ru: 'Горизонтальные жалюзи из бамбука: лёгкие, прочные, с тёплым природным цветом.',
    },
    colors: [c('Tabiiy', 'Натуральный', '#D2B07A'), c('Karamel', 'Карамель', '#B07A42'), c('Qoramtir', 'Тёмный', '#5E4430')],
    price: null,
  },
  {
    id: 'dikey-jakkard',
    name: { uz: 'Dikey jalyuzi, jakkard', ru: 'Вертикальные жалюзи, жаккард' },
    type: 'vertical',
    pattern: pat('damask'),
    fabric: { uz: 'Jakkard lamellar, 89 mm', ru: 'Жаккардовые ламели, 89 мм' },
    description: {
      uz: 'Naqshli jakkard lamellar: ofis jalyuzisining qulayligi va uy pardasining chiroyi.',
      ru: 'Жаккардовые ламели с узором: удобство офисных жалюзи и красота домашних штор.',
    },
    colors: [c('Oq', 'Белый', '#F2F0EA'), c('Shampan', 'Шампань', '#E3D3B2'), c('Kulrang', 'Серый', '#A9ACB1')],
    price: null,
  },
  {
    id: 'plise-blackout',
    name: { uz: 'Plise blackout', ru: 'Плиссе блэкаут' },
    type: 'pleated',
    fabric: { uz: 'Blackout burmali mato', ru: 'Плиссированный блэкаут' },
    description: {
      uz: 'Yorugʻlik oʻtkazmaydigan plise: mansard va yotoqxona derazalari uchun.',
      ru: 'Плиссе, не пропускающее свет: для мансардных окон и спальни.',
    },
    colors: [c('Oq', 'Белый', '#EDEDEA'), c('Bej', 'Бежевый', '#CDBD9F'), c('Antrasit', 'Антрацит', '#4E525A')],
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
