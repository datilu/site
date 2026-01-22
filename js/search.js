// static/js/search.js
console.log('search.js carregado (versão atualizada)');

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('pesquisa');
  const resultsEl = document.getElementById('results');
  if (!input || !resultsEl) {
    console.error('Elemento #pesquisa ou #results não encontrado');
    return;
  }

  let posts = [];
  let loaded = false;
  let timer = null;
  let matches = [];
  let selectedIndex = -1;

  // carregar index.json (tenta alguns caminhos e evita cache)
  (async function loadIndex() {
    const tries = ['./index.json', '/index.json', 'index.json'];
    for (const path of tries) {
      try {
        console.log('Tentando carregar', path);
        const res = await fetch(path, { cache: 'no-store' });
        console.log(path, '->', res.status);
        if (res.ok) {
          posts = await res.json();
          loaded = true;
          console.log('index.json carregado:', posts.length, 'posts');
          return;
        }
      } catch (err) {
        console.warn('Erro carregando', path, err);
      }
    }
    console.error('index.json não encontrado. Verifique layouts/_default/index.json e outputs no config.');
  })();

  // segurança mínima contra XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, s =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[s])
    );
  }

  // render dos resultados
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

  // fechar resultados
  function closeResults() {
    resultsEl.innerHTML = '';
    resultsEl.classList.remove('active');
    matches = [];
    selectedIndex = -1;
  }

  // pesquisa (proteções contra campos ausentes)
  function doSearch(q) {
    if (!q || q.trim().length < 2) {
      closeResults();
      return;
    }
    if (!loaded) {
      console.warn('index.json ainda não carregado — aguarde');
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

  // debounce wrapper
  function debounceSearch(val) {
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(val), 160);
  }

  // eventos
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

  // atualiza o highlight de seleção do teclado
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

  // clique nos resultados (delegation)
  resultsEl.addEventListener('click', e => {
    const a = e.target.closest('.search-link');
    if (!a) return;
    const i = Number(a.getAttribute('data-i'));
    if (Number.isFinite(i) && matches[i]) {
      // navega via href padrão do <a>, sem interferir
      // permitir comportamento normal (navegação)
    }
  });

  // fechar ao clicar fora (input e results)
  document.addEventListener('click', e => {
    if (!resultsEl.contains(e.target) && e.target !== input) {
      closeResults();
    }
  });

  // impedir o clique no input de fechar imediatamente
  input.addEventListener('click', e => e.stopPropagation());
});
