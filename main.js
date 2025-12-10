/* main.js
   Contains site-wide scripts: theme toggle wiring, UI helpers, small UX overlays,
   and progressive enhancement hooks (PWA/service worker registration placeholder).
*/

/* ---------- Utilities ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* Update year in footer(s) (multiple pages reference different IDs) */
document.addEventListener('DOMContentLoaded', () => {
  const yearEls = $$('.container #year, #year-2, #year-3, #year-4, #year-5, #year-6');
  // Simpler: set all spans with id starting with 'year' if present
  ['year','year-2','year-3','year-4','year-5','year-6'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = new Date().getFullYear();
  });
});

/* Theme toggle wiring */
function wireThemeToggles(){
  const toggles = $$('.theme-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      // toggle theme (theme.js handles actual switch)
      window.toggleTheme();
    });
  });
}

/* Simple page highlight for current nav link based on pathname */
function highlightCurrentLink(){
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a=>{
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === path);
  });
}

/* Drag subtle UX: add small animation using GSAP if available */
function subtleEntrance(){
  if(window.gsap){
    gsap.from('.card', {y: 12, opacity:0, duration:0.6, stagger:0.06, ease:'power2.out'});
  } else {
    // fallback CSS will handle card hover/transform
  }
}

/* PWA service worker registration (optional) 
   Note: Add a service-worker.js and manifest.json in the project root to enable offline caching.
*/
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker?.register('/service-worker.js')
      .then(reg => {
        // registration succeeded
        console.log('SW registered', reg.scope);
      }).catch(err=>{
        // swallow - not critical
        console.warn('SW registration failed', err);
      });
  });
}

/* initialize on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  wireThemeToggles();
  highlightCurrentLink();
  subtleEntrance();
});
