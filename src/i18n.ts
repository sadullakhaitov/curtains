export type Lang = 'uz' | 'ru';
/** A piece of text in both languages. */
export type L = { uz: string; ru: string };

const ruPlural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

const uz = {
  htmlTitle: 'NewMoon — Pardalar saloni',
  brandSub: 'PARDALAR SALONI',
  langLabel: 'Til',
  back: 'Orqaga',
  close: 'Yopish',
  home: 'Bosh sahifa',
  toDay: 'Kun rejimiga oʻtish',
  toNight: 'Tun rejimiga oʻtish',
  navMenu: 'Asosiy menyu',
  navHome: 'Asosiy',
  navCatalog: 'Katalog',
  navFav: 'Sevimli',
  navContact: 'Aloqa',
  navTry: 'Derazamda sinash',
  search: 'Qidirish',
  searchPh: 'Parda, rang yoki mato…',
  display: 'Derazangizga<br><em>munosib</em> parda',
  heroAlt: 'Kulrang pardali zamonaviy yotoqxona',
  tryTag: 'Kamerada sinash',
  tryTitle: 'Derazangizda koʻring',
  trySub: 'Tanlang, suratga oling — parda joyida',
  types: 'Turlar',
  all: 'Barchasi',
  type: { classic: 'Klassik', tulle: 'Tyul', roller: 'Rulonli', zebra: 'Zebra' },
  dayNight: 'Kun – tun (yorugʻlik)',
  popular: 'Mashhur pardalar',
  seeAll: 'Hammasi',
  how: 'Qanday ishlaydi?',
  steps: [
    ['Pardani tanlang', 'Katalogdan mato va rangni tanlang'],
    ['Derazani suratga oling', 'Yoki galereyadan rasm yuklang'],
    ['Burchaklarni belgilang', 'Parda derazaga aniq tushadi'],
    ['Saqlang va ulashing', 'Rasm telefoningizda qoladi'],
  ],
  catalog: 'Katalog',
  favs: 'Sevimlilar',
  count: (n: number) => `${n} ta parda`,
  colorsCount: (n: number) => `${n} ta rang`,
  emptyTitle: 'Hech narsa topilmadi',
  emptyFav: 'Yurakcha belgisini bosib pardalarni sevimlilarga qoʻshing.',
  emptySearch: 'Boshqa soʻz yoki turni sinab koʻring.',
  priceOnRequest: 'Narxi soʻrov boʻyicha',
  perMeter: 'soʻm / m',
  inInterior: 'interyerda',
  addFav: 'Sevimlilarga qoʻshish',
  favAdded: 'Sevimlilarga qoʻshildi',
  favRemoved: 'Sevimlilardan olib tashlandi',
  notFound: 'Parda topilmadi',
  backToCatalog: 'Katalogga qaytish',
  view: 'Koʻrinish',
  fabricTab: 'Mato',
  interiorTab: 'Interyer',
  fabricOf: (name: string, color: string) => `${name} matosi, ${color} rang`,
  color: 'Rang',
  tryOnWindow: 'Derazamda koʻrish',
  tryLast: 'Oldingi rasmimda sinash',
  orderTg: 'Telegram orqali buyurtma',
  call: 'Qoʻngʻiroq qilish',
  tgProduct: (name: string, color: string) =>
    `Assalomu alaykum! Menga "${name}" (${color}) pardasi yoqdi. Narxi va oʻlchov haqida maʼlumot bersangiz.`,
  camView: 'Kamera koʻrinishi',
  camOff: 'Kamera ochilmadi',
  camOffDefault: 'Galereyadan rasm yuklang yoki namuna xonada sinab koʻring.',
  camNoSupport: 'Bu brauzer kamerani qoʻllamaydi. Galereyadan rasm yuklang.',
  camInsecure: 'Kamera faqat xavfsiz (https) saytda ishlaydi. Galereyadan rasm yuklang.',
  camDenied: 'Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki galereyadan rasm yuklang.',
  changeCurtain: 'Pardani almashtirish',
  change: 'Almashtirish',
  torch: 'Chiroq',
  frameHint: 'Derazani toʻliq kadrga oling',
  sample: 'Kamera yoʻqmi? Namuna xonada sinash',
  gallery: 'Galereyadan yuklash',
  shoot: 'Suratga olish',
  flip: 'Kamerani almashtirish',
  camControls: 'Kamera boshqaruvi',
  camNotReady: 'Kamera tayyor emas — galereyadan rasm yuklang',
  badImage: 'Rasmni ochib boʻlmadi',
  sampleFail: 'Namuna rasm yuklanmadi',
  curtainOnWindow: 'Derazaga qoʻyilgan parda',
  corner: (i: number) => `Deraza burchagi ${i}. Strelka tugmalari bilan suring`,
  moveHint: 'Nuqtalarni deraza burchaklariga suring',
  drawFail: 'Pardani chizib boʻlmadi',
  drawFailHint: 'Boshqa brauzerda (Chrome, Safari) urinib koʻring.',
  retake: 'Qayta suratga olish',
  resetCorners: 'Burchaklarni qayta joylash',
  autoDetect: 'Derazani avtomatik topish',
  autoFound: 'Deraza topildi — kerak boʻlsa nuqtalarni toʻgʻrilang',
  autoNotFound: 'Derazani topa olmadim — derazaning oʻziga bosing',
  aiLoading: 'Sunʼiy intellekt yuklanmoqda…',
  loading3d: '3D parda tayyorlanmoqda…',
  aiAnalyzing: 'Deraza aniqlanmoqda…',
  tapHint: 'Derazaga bosing yoki nuqtalarni suring',
  tapNotFound: 'Bu yerda deraza topilmadi — derazaning oʻrtasiga bosing',
  preview: 'Koʻrish',
  edit: 'Tahrirlash',
  done: 'Tayyor',
  settings: 'Sozlamalar',
  curtain: 'Parda',
  open: 'Pardani ochish',
  lift: 'Koʻtarish',
  tulle: 'Tyul zichligi',
  drop: 'Uzunlik (deraza ostiga)',
  preparing: 'Rasm tayyorlanmoqda…',
  prepFail: 'Rasmni tayyorlab boʻlmadi',
  noCurtain: 'Pardasiz deraza',
  onWindow: (name: string, color: string) => `${name} (${color}) derazada`,
  backToAdjust: 'Moslashga qaytish',
  compare: 'Taqqoslash',
  before: 'Oldin',
  after: 'Keyin',
  save: 'Saqlash',
  share: 'Ulashish',
  orderThis: 'Shu pardaga buyurtma berish',
  callOrder: 'Buyurtma uchun qoʻngʻiroq',
  tryOther: 'Boshqa parda bilan sinash',
  newPhoto: 'Yangi rasm',
  saved: 'Rasm saqlandi',
  ready: 'Tayyor!',
  shareFallback: 'Ulashish imkoni yoʻq — rasm yuklab olindi',
  tgResult: (name: string, color: string) =>
    `Assalomu alaykum! NewMoon saytida "${name}" (${color}) pardasini derazamda sinab koʻrdim. Narxi va oʻlchov haqida maʼlumot bersangiz.`,
  contact: 'Aloqa',
  contactTitle: 'Oʻlchov va buyurtma',
  contactText: 'Usta uyingizga kelib, derazangizni oʻlchab beradi. Parda oʻlchamingiz boʻyicha tikiladi.',
  contactSoon: 'Aloqa maʼlumotlari tez orada',
  contactSoonText: 'Telefon va Telegram manzili shu yerda boʻladi.',
  phone: 'Telefon',
  logoAlt: 'NewMoon logotipi',
};

type Dict = typeof uz;

const ru: Dict = {
  htmlTitle: 'NewMoon — Салон штор',
  brandSub: 'САЛОН ШТОР',
  langLabel: 'Язык',
  back: 'Назад',
  close: 'Закрыть',
  home: 'Главная',
  toDay: 'Включить светлую тему',
  toNight: 'Включить тёмную тему',
  navMenu: 'Главное меню',
  navHome: 'Главная',
  navCatalog: 'Каталог',
  navFav: 'Избранное',
  navContact: 'Контакты',
  navTry: 'Примерить на окне',
  search: 'Поиск',
  searchPh: 'Штора, цвет или ткань…',
  display: 'Шторы, <em>достойные</em><br>вашего окна',
  heroAlt: 'Современная спальня с серыми шторами',
  tryTag: 'Примерка по камере',
  tryTitle: 'Примерьте на своём окне',
  trySub: 'Выберите, сфотографируйте — штора на месте',
  types: 'Типы',
  all: 'Все',
  type: { classic: 'Классика', tulle: 'Тюль', roller: 'Рулонные', zebra: 'Зебра' },
  dayNight: 'День – ночь (свет)',
  popular: 'Популярные шторы',
  seeAll: 'Все',
  how: 'Как это работает?',
  steps: [
    ['Выберите штору', 'Ткань и цвет — в каталоге'],
    ['Сфотографируйте окно', 'Или загрузите фото из галереи'],
    ['Отметьте углы', 'Штора точно ляжет на окно'],
    ['Сохраните и поделитесь', 'Фото останется в телефоне'],
  ],
  catalog: 'Каталог',
  favs: 'Избранное',
  count: (n: number) => `${n} ${ruPlural(n, 'штора', 'шторы', 'штор')}`,
  colorsCount: (n: number) => `${n} ${ruPlural(n, 'цвет', 'цвета', 'цветов')}`,
  emptyTitle: 'Ничего не найдено',
  emptyFav: 'Нажмите на сердечко, чтобы добавить шторы в избранное.',
  emptySearch: 'Попробуйте другое слово или тип.',
  priceOnRequest: 'Цена по запросу',
  perMeter: 'сум / м',
  inInterior: 'в интерьере',
  addFav: 'Добавить в избранное',
  favAdded: 'Добавлено в избранное',
  favRemoved: 'Удалено из избранного',
  notFound: 'Штора не найдена',
  backToCatalog: 'Вернуться в каталог',
  view: 'Вид',
  fabricTab: 'Ткань',
  interiorTab: 'Интерьер',
  fabricOf: (name: string, color: string) => `Ткань «${name}», цвет ${color.toLowerCase()}`,
  color: 'Цвет',
  tryOnWindow: 'Примерить на окне',
  tryLast: 'Примерить на прошлом фото',
  orderTg: 'Заказать в Telegram',
  call: 'Позвонить',
  tgProduct: (name: string, color: string) =>
    `Здравствуйте! Мне понравилась штора «${name}» (${color}). Подскажите, пожалуйста, цену и условия замера.`,
  camView: 'Изображение с камеры',
  camOff: 'Камера не открылась',
  camOffDefault: 'Загрузите фото из галереи или попробуйте на примере комнаты.',
  camNoSupport: 'Этот браузер не поддерживает камеру. Загрузите фото из галереи.',
  camInsecure: 'Камера работает только на защищённом (https) сайте. Загрузите фото из галереи.',
  camDenied: 'Доступ к камере запрещён. Разрешите его в настройках браузера или загрузите фото из галереи.',
  changeCurtain: 'Сменить штору',
  change: 'Сменить',
  torch: 'Фонарик',
  frameHint: 'Поместите окно целиком в кадр',
  sample: 'Нет камеры? Попробуйте на примере',
  gallery: 'Загрузить из галереи',
  shoot: 'Сделать снимок',
  flip: 'Сменить камеру',
  camControls: 'Управление камерой',
  camNotReady: 'Камера не готова — загрузите фото из галереи',
  badImage: 'Не удалось открыть фото',
  sampleFail: 'Не удалось загрузить пример',
  curtainOnWindow: 'Штора на окне',
  corner: (i: number) => `Угол окна ${i}. Двигайте стрелками`,
  moveHint: 'Перетащите точки в углы окна',
  drawFail: 'Не удалось отрисовать штору',
  drawFailHint: 'Попробуйте другой браузер (Chrome, Safari).',
  retake: 'Переснять',
  resetCorners: 'Сбросить углы',
  autoDetect: 'Найти окно автоматически',
  autoFound: 'Окно найдено — при необходимости поправьте точки',
  autoNotFound: 'Окно не найдено — нажмите на само окно',
  aiLoading: 'Загружаем ИИ…',
  loading3d: 'Готовим 3D-штору…',
  aiAnalyzing: 'Ищем окно…',
  tapHint: 'Нажмите на окно или перетащите точки',
  tapNotFound: 'Здесь окно не найдено — нажмите в центр окна',
  preview: 'Просмотр',
  edit: 'Изменить',
  done: 'Готово',
  settings: 'Настройки',
  curtain: 'Штора',
  open: 'Раздвинуть шторы',
  lift: 'Поднять',
  tulle: 'Плотность тюля',
  drop: 'Длина (ниже окна)',
  preparing: 'Готовим фото…',
  prepFail: 'Не удалось подготовить фото',
  noCurtain: 'Окно без штор',
  onWindow: (name: string, color: string) => `${name} (${color}) на окне`,
  backToAdjust: 'Вернуться к настройке',
  compare: 'Сравнение',
  before: 'До',
  after: 'После',
  save: 'Сохранить',
  share: 'Поделиться',
  orderThis: 'Заказать эту штору',
  callOrder: 'Позвонить для заказа',
  tryOther: 'Примерить другую',
  newPhoto: 'Новое фото',
  saved: 'Фото сохранено',
  ready: 'Готово!',
  shareFallback: 'Поделиться нельзя — фото скачано',
  tgResult: (name: string, color: string) =>
    `Здравствуйте! Я примерил(а) штору «${name}» (${color}) на своём окне на сайте NewMoon. Подскажите, пожалуйста, цену и условия замера.`,
  contact: 'Контакты',
  contactTitle: 'Замер и заказ',
  contactText: 'Мастер приедет к вам домой и замерит окна. Шторы шьются по вашим размерам.',
  contactSoon: 'Контакты скоро появятся',
  contactSoonText: 'Здесь будут телефон и Telegram.',
  phone: 'Телефон',
  logoAlt: 'Логотип NewMoon',
};

const dicts: Record<Lang, Dict> = { uz, ru };

function detect(): Lang {
  try {
    const saved = localStorage.getItem('nm-lang');
    if (saved === 'uz' || saved === 'ru') return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.languages || [navigator.language]).map((l) => (l || '').toLowerCase());
  // Uzbek first if the phone mentions it at all; otherwise Russian for ru/kk/ky/tg/be/uk; default Uzbek.
  if (nav.some((l) => l.startsWith('uz'))) return 'uz';
  if (nav.some((l) => /^(ru|kk|ky|tg|be|uk)/.test(l))) return 'ru';
  return 'uz';
}

let lang: Lang = detect();

export const getLang = () => lang;
/** Current dictionary: `t().save`, `t().count(3)`. */
export const t = () => dicts[lang];
/** Picks the current language from a bilingual value. */
export const tx = (l: L) => l[lang];

function applyDocument() {
  document.documentElement.lang = lang;
  document.title = t().htmlTitle;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem('nm-lang', next);
  } catch {
    /* ignore */
  }
  applyDocument();
  document.dispatchEvent(new CustomEvent('langchange', { detail: next }));
}

export function initLang() {
  applyDocument();
}
