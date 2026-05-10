/* ─────────────────────────────────────────────
   SEARCH.JS — Fuzzy search with suggestions
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Search = (() => {
  /* Simple fuzzy scorer: returns 0–1 score for how well needle matches haystack */
  function _fuzzyScore(needle, haystack) {
    if (!needle) return 1;
    const n = needle.toLowerCase();
    const h = haystack.toLowerCase();

    if (h === n) return 1;
    if (h.startsWith(n)) return 0.95;
    if (h.includes(n)) return 0.8;

    /* Character sequence match */
    let ni = 0;
    let score = 0;
    let lastMatch = -1;
    for (let hi = 0; hi < h.length && ni < n.length; hi++) {
      if (h[hi] === n[ni]) {
        score += 1 + (lastMatch === hi - 1 ? 0.5 : 0);
        lastMatch = hi;
        ni++;
      }
    }
    if (ni < n.length) return 0; // not all chars matched
    return (score / n.length) * 0.6;
  }

  function score(query, game) {
    if (!query) return 1;
    const q = query.toLowerCase().trim();
    if (!q) return 1;

    const scores = [
      _fuzzyScore(q, game.title) * 1.0,
      _fuzzyScore(q, game.creator) * 0.6,
      _fuzzyScore(q, game.genre) * 0.7,
      _fuzzyScore(q, game.desc) * 0.3,
      ...game.tags.map(t => _fuzzyScore(q, t) * 0.5),
    ];
    return Math.max(...scores);
  }

  function filter(query, games) {
    if (!query || !query.trim()) return games;
    const THRESHOLD = 0.2;
    return games
      .map(g => ({ game: g, score: score(query, g) }))
      .filter(x => x.score >= THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map(x => x.game);
  }

  /* Suggestions — top 5 games matching the query */
  function getSuggestions(query, limit = 5) {
    if (!query || query.trim().length < 2) return [];
    const THRESHOLD = 0.3;
    return RP.GAMES
      .map(g => ({ game: g, score: score(query, g) }))
      .filter(x => x.score >= THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.game);
  }

  /* Search UI wiring */
  function initUI(onSearch) {
    const input    = document.getElementById('searchInput');
    const clear    = document.getElementById('searchClear');
    const dropdown = document.getElementById('searchSuggestions');
    let debounce   = null;
    let focusedIdx = -1;

    function showSuggestions(query) {
      const items = getSuggestions(query);
      if (!items.length) { dropdown.hidden = true; return; }

      dropdown.innerHTML = items.map((g, i) => `
        <div class="suggestion-item" role="option" data-idx="${i}" data-id="${g.id}" tabindex="-1">
          <span class="suggestion-emoji">${g.emoji}</span>
          <span class="suggestion-name">${_highlight(g.title, query)}</span>
          <span class="suggestion-genre">${g.genre}</span>
        </div>`).join('');

      dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          const game = RP.GAMES.find(g => g.id === item.dataset.id);
          if (game) {
            input.value = game.title;
            clear.hidden = false;
            dropdown.hidden = true;
            onSearch(game.title);
            setTimeout(() => RP.Modal.open(game), 50);
          }
        });
      });
      dropdown.hidden = false;
    }

    function _highlight(text, query) {
      if (!query) return text;
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
      return text.replace(re, '<strong>$1</strong>');
    }

    input.addEventListener('input', () => {
      const q = input.value.trim();
      clear.hidden = !q;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        onSearch(q);
        if (q.length >= 2) showSuggestions(q);
        else dropdown.hidden = true;
      }, 120);
    });

    clear.addEventListener('click', () => {
      input.value = '';
      clear.hidden = true;
      dropdown.hidden = true;
      onSearch('');
      input.focus();
    });

    /* Keyboard nav in dropdown */
    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.suggestion-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('focused', i === focusedIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, -1);
        items.forEach((el, i) => el.classList.toggle('focused', i === focusedIdx));
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        items[focusedIdx]?.dispatchEvent(new MouseEvent('mousedown'));
      } else if (e.key === 'Escape') {
        dropdown.hidden = true;
        focusedIdx = -1;
      }
    });

    /* Close on outside click */
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) {
        dropdown.hidden = true;
        focusedIdx = -1;
      }
    });
  }

  return { filter, getSuggestions, initUI };
})();
