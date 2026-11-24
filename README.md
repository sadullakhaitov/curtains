# NewMoon — pardalar saloni sayti

Xaridor katalogdan pardani tanlaydi, derazasini telefon kamerasi bilan suratga oladi (yoki galereyadan rasm yuklaydi),
deraza burchaklarini belgilaydi — parda perspektivani hisobga olgan holda derazaga "kiyiladi". Natijani telefonga saqlash,
ulashish yoki Telegram orqali buyurtma berish mumkin.

## Imkoniyatlar

- **Derazada sinash** — WebGL'da yozilgan renderer: real barxat mato fotosuratidan olingan tekstura, istalgan rangga
  boʻyaladi; klassik parda (ikki panel + tyul + karniz), tyul va rulonli parda turlari. Hammasi telefonning oʻzida
  hisoblanadi — rasm hech qayerga yuborilmaydi.
- **Kamera** — orqa kamera, chiroq (qoʻllasa), kamerani almashtirish; kamera boʻlmasa galereyadan yuklash yoki
  namuna xona rasmida sinash.
- **Derazani aqlli topish** — telefonning oʻzida ishlaydigan sunʼiy intellekt (Google MediaPipe, Apache-2.0):
  - tezkor yorugʻlik tahlili derazaning taxminiy joyini topadi (`src/ar/detect.ts`);
  - *Magic Touch* modeli shu nuqtadagi derazani aniq ajratadi, unga rom chiziqlari boʻyicha 4 burchak moslanadi,
    bir nechta tavaqa birlashtiriladi (`src/ar/smart.ts`);
  - ishonchli topilmasa — xaridor derazaga **bir marta bosadi** va u oʻzi belgilanadi.
- **Old plandagi buyumlar** — *DeepLab v3* kreslo, divan, gul, odam, stolni topadi; ular parda **oldida** qoladi
  (deraza ortidagi narsalar emas). Chegaralar rasm boʻyicha aniqlashtiriladi (guided filter).
- **Modellar faqat kerak boʻlganda** yuklanadi (kamera ochilganda fonda, ~13 MB bir marta, keyin brauzer keshida);
  yuklanmasa, tezkor usul ishlayveradi. Fayllar saytning oʻzida: `public/mediapipe/`, `public/models/`.
- **3D parda** (three.js, faqat Moslash ekranida yuklanadi): burchaklardan kamera fokusi va derazaning holati
  hisoblanadi; burmalar haqiqiy 3D (yigʻilganda chuqurlashadi), barxat/satin/xira material, xona surati atrof-muhit
  yorugʻligi sifatida, devorga yumshoq soya, deraza nuri mato orqali. 3D ishlamasa 2D renderer ishlaydi.
- **Yashiriladigan sozlamalar** — pastki panelni barmoq bilan pastga tortib, rasmni toʻliq koʻrish mumkin.
- **Moslash** — 4 ta burchakni barmoq bilan surish (kattalashtiruvchi lupa bilan), pardani ochish/yopish, tyul zichligi,
  uzunlik, boshqa parda va ranglarga shu rasmning oʻzida oʻtish.
- **Natija** — "Oldin / Keyin" taqqoslash, NewMoon belgisi bilan JPEG; telefonda "Saqlash" ulashish oynasini ochadi
  (u yerdan "Rasmni saqlash" → galereya), kompyuterda faylni yuklab oladi.
- **Kun / tun rejimi** — tizim sozlamasiga qarab avtomatik, tugma bilan almashtiriladi (doira shaklida silliq oʻtish),
  tanlov eslab qolinadi.
- **Ikki til** — oʻzbekcha va ruscha (UZ | RU tugmasi), telefon tiliga qarab avtomatik tanlanadi, tanlov eslab qolinadi.
- **Liquid glass** dizayn, sahifalar orasida silliq oʻtishlar (View Transitions API), `prefers-reduced-motion` hurmat qilinadi.
- **Yengil** — freymvorksiz (Vite + TypeScript), JS ~25 KB gzip, har bir sahifa kodi faqat kerak boʻlganda yuklanadi,
  rasmlar WebP (jami ~300 KB).

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173 — telefonda sinash uchun bir xil Wi‑Fi'dagi IP manzilni oching
npm run build      # tayyor sayt dist/ papkasiga
npm run preview    # build qilingan saytni koʻrish
npm run build:artifact  # claude.ai sahifasi uchun bitta skriptli versiya (dist-artifact/)
```

> **Muhim:** brauzerlar kamerani faqat **https** saytda (yoki `localhost`da) ochadi. Saytni internetga joylaganda
> HTTPS boʻlishi shart (GitHub Pages, Netlify, Vercel, Cloudflare Pages — hammasida avtomatik). `dist/` papkasi
> oddiy statik fayllar, istalgan hostingga yuklash mumkin.

## Internetda

Sayt GitHub Pages'da: **https://sadullakhaitov.github.io/curtains/**. `.github/workflows/pages.yml` har bir push'da saytni
qayta yigʻib, `gh-pages` branch'iga joylaydi (Settings → Pages → Source: `gh-pages` / root).

## Haqiqiy mato suratidan parda (zebra va boshqalar)

`Zebra Damask` mahsuloti kompaniyaning oʻz suratidan yasalgan: surat perspektivadan toʻgʻrilanadi, takrorlanuvchi
qismi (4 ta chiziq davri) kesiladi, yorugʻligi tekislanadi va alfa kanalga har bir qatorning qalinligi yoziladi
(qalin chiziq 255, shaffof ~140). Natija `public/images/zebra_damask.webp` — `products.ts` dagi `texture` maydoni.
Boshqa mahsulotlar uchun ham shu yoʻl bilan tekstura tayyorlash mumkin: matoni toʻgʻridan-toʻgʻri, yaxshi yorugʻlikda suratga oling.

## Sozlash

| Nima | Qayerda |
|---|---|
| Telegram va telefon raqami | `src/config.ts` → `CONTACT` (boʻsh boʻlsa tugmalar yashiriladi) |
| Pardalar, ranglar, narxlar (uz/ru) | `src/data/products.ts` |
| Sayt matnlari (uz/ru) | `src/i18n.ts` |
| Mahsulot rasmlari | `public/images/` (WebP, ~480×600) |
| Ranglar va dizayn tokenlari | `src/styles/main.css` boshida (`:root` — tun, `[data-theme='day']` — kun) |

Yangi parda qoʻshish: `products.ts` dagi roʻyxatga yangi obyekt qoʻshing. `type` — `classic`, `tulle` yoki `roller`.
Rang `hex` qiymati mato teksturasiga koʻpaytiriladi, shuning uchun matoning eng och tusini yozing.

## Tuzilishi

```
src/
  main.ts            marshrutlar
  router.ts          hash-router + sahifa oʻtishlari
  theme.ts           kun/tun rejimi
  store.ts           joriy sinov holati (rasm, burchaklar, sozlamalar)
  ar/homography.ts   perspektiva matematikasi (kvadrat → toʻrtburchak)
  ar/detect.ts       yorugʻlik + toʻgʻri chiziqlar boʻyicha deraza
  ar/vision.ts       MediaPipe: Magic Touch va DeepLab modellari
  ar/smart.ts        aqlli qidiruv, bosib tanlash, old plandagi buyumlar
  ar/renderer3d.ts   3D parda (three.js)
  ar/renderer.ts     WebGL shader (2D zaxira): parda, tyul, karniz, rulonli parda
  ar/export.ts       JPEG yaratish, saqlash, ulashish
  views/             bosh sahifa, katalog, parda, kamera, moslash, natija, aloqa
  ui/sheet.ts        pastga yashiriladigan panel
  ui/                ikonkalar, kartochka, yordamchi funksiyalar
```

## Rasmlar

Interyer va mato suratlari [Unsplash](https://unsplash.com) litsenziyasi asosida (tijoriy foydalanish bepul):
`photo-1616594039964`, `photo-1617104678098`, `photo-1582719478250`, `photo-1590490360182`,
`photo-1540518614846` (interyerlar), `photo-1585412727339` (namuna xona), `photo-1514306191717` (mato teksturasi).
Ishga tushirishdan oldin ularni kompaniyaning oʻz pardalari suratlari bilan almashtirish tavsiya etiladi.
