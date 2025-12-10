/* theme.js
   Handles theme switching (light/dark), saves preference in localStorage,
   and applies it early to avoid flash-of-incorrect-theme.
*/

/* Immediately apply saved theme to avoid flash */
(function applyInitialTheme(){
  try{
    const saved = localStorage.getItem('fc:theme');
    if(saved){
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // default to system preference if available
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }catch(e){
    console.warn('Theme init error', e);
  }
})();

/* Toggle function exported to window for other scripts */
window.toggleTheme = function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try{
    localStorage.setItem('fc:theme', next);
  }catch(e){
    console.warn('Could not save theme', e);
  }
};

/* Optional: expose a function to set theme directly */
window.setTheme = function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem('fc:theme', theme); }catch(e){}
};
