/* ─────────────────────────────────────────────
   HISTORY.JS — Recently viewed tracker
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.History = (() => {
  const KEY = 'rp_history';
  const MAX = 10;
  let _history = [];

  function _load() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) _history = JSON.parse(s);
    } catch (_) {}
  }

  function _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(_history));
    } catch (_) {}
  }

  function push(id) {
    _history = _history.filter(x => x !== id);
    _history.unshift(id);
    if (_history.length > MAX) _history.length = MAX;
    _save();
    _render();
  }

  function clear() {
    _history = [];
    _save();
    _render();
  }

  function _render() {
    const section = document.getElementById('recentSection');
    const row = document.getElementById('recentRow');
    if (!section || !row) return;

    if (_history.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    const games = _history.map(id => RP.GAMES.find(g => g.id === id)).filter(Boolean);

    row.innerHTML = games.map(g => {
      const thumbUrl = g.universeId ? RP.API.getThumb(g.universeId) : null;
      const imgTag = thumbUrl
        ? `<img src="${thumbUrl}" alt="${g.title}" class="loaded" loading="lazy" />`
        : `<img data-uid="${g.universeId || ''}" alt="${g.title}" loading="lazy" />`;
      return `
        <div class="mini-card" data-id="${g.id}" role="button" tabindex="0" aria-label="Open ${g.title}">
          <div class="mini-thumb" style="background:${RP.GENRE_COLORS[g.genre]}">
            ${imgTag}
            <span class="mini-emoji" aria-hidden="true">${g.emoji}</span>
          </div>
          <div class="mini-body">
            <div class="mini-title">${g.title}</div>
            <div class="mini-rating">👍 ${g.rating}%</div>
          </div>
        </div>`;
    }).join('');

    row.querySelectorAll('.mini-card').forEach(card => {
      const handler = () => {
        const game = RP.GAMES.find(g => g.id === card.dataset.id);
        if (game) RP.Modal.open(game);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  function init() {
    _load();
    _render();
    document.getElementById('clearRecent')?.addEventListener('click', clear);
  }

  return { init, push, clear };
})();
