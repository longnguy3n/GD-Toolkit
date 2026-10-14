try { document.documentElement.dataset.theme=localStorage.getItem('gd-toolkit-theme')==='light'?'light':'dark'; } catch { document.documentElement.dataset.theme='dark'; }
