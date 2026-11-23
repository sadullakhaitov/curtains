import './styles/main.css';
import { route, startRouter } from './router';
import { initTheme } from './theme';

initTheme();
// Fabric texture for CSS swatches; resolved against the page so it works from any sub-path.
document.documentElement.style.setProperty('--fold-url', `url("${new URL('images/folds.webp', document.baseURI).href}")`);

// Screens are loaded on demand, so the first visit only downloads the home page code.
route('/', () => import('./views/home').then((m) => m.default));
route('/catalog', () => import('./views/catalog').then((m) => m.default));
route('/p/:id', () => import('./views/product').then((m) => m.default));
route('/try', () => import('./views/camera').then((m) => m.default));
route('/try/:id', () => import('./views/camera').then((m) => m.default));
route('/adjust', () => import('./views/adjust').then((m) => m.default));
route('/result', () => import('./views/result').then((m) => m.default));
route('/contact', () => import('./views/contact').then((m) => m.default));

startRouter(document.getElementById('app')!);
