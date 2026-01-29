// static/js/search.js
// Versão unificada: menu + search, sem returns que encerram tudo

(function () {
  // --- util de log para debug rápido ---
  function dbg(...args) { console.log('[search.js]', ...args); }

  // --- MENU (rodar imediatamente; script está no final do body) ---
  try {
    const menuBtn = document.querySelector('.menu-btn');
    const menu = document.querySelector('.menu');

    if (menuBtn && menu) {
      menuBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
        dbg('menu toggled, open=', menu.classList.contains('open'));
      });
      dbg('menu listener registrado');
    } else {
      dbg('menu ou menu-btn não encontrados (verifique HTML/CSS)');
    }
  } catch (err) {
    console.error('[search.js] erro no bloco do menu', err);
  }

  // --- SEARCH (aguarda DOMContentLoaded ou roda imediatamente se já passou) ---
  function initSearch() {
    dbg('iniciando search');

    const input = document.getElementById('pesquisa');
    const resultsEl = document.getElementById('results');

    if (!input || !resultsEl) {
      console.warn('[search.js] elemento #pesquisa ou #results não encontrado — search desativado, mas menu continua');
      return; // só encerra a parte de search, o resto do script já rodou
    }

    let posts = [];
    let loaded = false;
    let timer = null;
    let matches = [];
    let selectedIndex = -1;

    (async function loadIndex() {
      const tries = ['./index.json', '/index.json', 'index.json'];
      for (const path of tries) {
        try {
          dbg('Tentando carregar', path);
          const res = await fetch(path, { cache: 'no-store' });
          dbg(path, '->', res.status);
          if (res.ok) {
            posts = await res.json();
            loaded = true;
            dbg('index.json carregado:', posts.length, 'posts');
            return;
          }
        } catch (err) {
          dbg('Erro carregando', path, err);
        }
      }
      console.error('[search.js] index.json não encontrado.');
    })();

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"'`=\/]/g, s =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[s])
      );
    }

    function render(list) {
      matches = list || [];
      selectedIndex = -1;

      if (!matches.length) {
        resultsEl.innerHTML = '';
        resultsEl.classList.remove('active');
        return;
      }

      resultsEl.classList.add('active');
      resultsEl.innerHTML = matches.slice(0, 7).map((p, i) => {
        const img = escapeHtml(p.image || '');
        const title = escapeHtml(p.title || '');
        const href = escapeHtml(p.url || '#');
        return `
          <div class="search-card" role="option" data-i="${i}">
            <a href="${href}" class="search-link" data-i="${i}">
              <div class="search-thumb">
                ${ img ? `<img class="search-img" src="${img}" alt="${title}">` : `<div class="search-img-fallback"></div>` }
              </div>
              <div class="search-overlay">
                <span class="search-title">${title}</span>
              </div>
            </a>
          </div>
        `;
      }).join('');
    }

    function closeResults() {
      resultsEl.innerHTML = '';
      resultsEl.classList.remove('active');
      matches = [];
      selectedIndex = -1;
    }

    function doSearch(q) {
      if (!q || q.trim().length < 2) {
        closeResults();
        return;
      }
      if (!loaded) {
        dbg('index.json ainda não carregado — aguarde');
        return;
      }

      const term = q.toLowerCase().trim();
      const filtered = posts.filter(p => {
        const title = (p.title || '').toString().toLowerCase();
        const desc = (p.description || '').toString().toLowerCase();
        const content = (p.content || '').toString().toLowerCase();
        const cats = (p.categories || []).map(c => c.toString().toLowerCase());
        return title.includes(term) || desc.includes(term) || content.includes(term) || cats.some(c => c.includes(term));
      });

      render(filtered);
    }

    function debounceSearch(val) {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(val), 160);
    }

    input.addEventListener('input', e => debounceSearch(e.target.value));

    input.addEventListener('keydown', e => {
      if (!resultsEl.classList.contains('active')) return;

      const cards = Array.from(resultsEl.querySelectorAll('.search-card'));
      if (!cards.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, cards.length - 1);
        updateSelection(cards);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(cards);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && matches[selectedIndex]) {
          window.location.href = matches[selectedIndex].url;
        } else if (matches[0]) {
          window.location.href = matches[0].url;
        }
      } else if (e.key === 'Escape') {
        closeResults();
      }
    });

    function updateSelection(cards) {
      cards.forEach((c, idx) => {
        if (idx === selectedIndex) {
          c.setAttribute('aria-selected', 'true');
          c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          c.setAttribute('aria-selected', 'false');
        }
      });
    }

    resultsEl.addEventListener('click', e => {
      const a = e.target.closest('.search-link');
      if (!a) return;
      const i = Number(a.getAttribute('data-i'));
      if (Number.isFinite(i) && matches[i]) {
        // navegação padrão
      }
    });

    document.addEventListener('click', e => {
      if (!resultsEl.contains(e.target) && e.target !== input) {
        closeResults();
      }
    });

    input.addEventListener('click', e => e.stopPropagation());
  } // fim initSearch

  // se DOMContentLoaded já aconteceu, roda já; caso contrário, aguarda
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }

  dbg('search.js carregado (versão unificada)');
})();
