/* ─────────────────────────────────────────────
   FAVORITES.JS — LocalStorage bookmark system
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Favorites = (() => {
  const KEY = 'rp_favorites';
  let _favs = new Set();

  function _load() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) _favs = new Set(JSON.parse(stored));
    } catch (_) {}
  }

  function _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify([..._favs]));
    } catch (_) {}
  }

  function has(id) { return _favs.has(id); }
  function count() { return _favs.size; }
  function all()   { return [..._favs]; }

  function toggle(id) {
    if (_favs.has(id)) {
      _favs.delete(id);
    } else {
      _favs.add(id);
    }
    _save();
    _updateUI();
    return _favs.has(id);
  }

  function _updateUI() {
    const n = _favs.size;

    /* Header badge */
    const badge = document.getElementById('favCount');
    const statEl = document.getElementById('statFavs');
    if (badge) {
      badge.textContent = n;
      badge.hidden = n === 0;
    }
    if (statEl) statEl.textContent = n;

    /* Update all heart buttons */
    document.querySelectorAll('.card-fav-btn[data-id]').forEach(btn => {
      const isFav = _favs.has(btn.dataset.id);
      btn.classList.toggle('active', isFav);
      btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
      btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    });

    /* Re-render panel if open */
    if (!document.getElementById('favPanelOverlay').hidden) {
      RP.Favorites.renderPanel();
    }
  }

  function renderPanel() {
    const body = document.getElementById('favPanelBody');
    if (!body) return;

    const ids = all();
    if (ids.length === 0) {
      body.innerHTML = `
        <div class="fav-empty">
          <div class="fav-empty-icon">💔</div>
          <div class="fav-empty-text">No favorites yet</div>
          <div class="fav-empty-sub">Click the ♥ on any game to save it here.</div>
        </div>`;
      return;
    }

    const games = ids.map(id => RP.GAMES.find(g => g.id === id)).filter(Boolean);
    body.innerHTML = games.map(g => `
      <div class="panel-fav-item" data-id="${g.id}" role="button" tabindex="0" aria-label="Open ${g.title}">
        <span class="fav-item-emoji">${g.emoji}</span>
        <span class="fav-item-title">${g.title}</span>
        <button class="fav-item-remove" data-remove="${g.id}" aria-label="Remove ${g.title} from favorites">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');

    /* Item click → open modal */
    body.querySelectorAll('.panel-fav-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.fav-item-remove')) return;
        const game = RP.GAMES.find(g => g.id === item.dataset.id);
        if (game) RP.Modal.open(game);
      });
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') item.click();
      });
    });

    /* Remove buttons */
    body.querySelectorAll('.fav-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggle(btn.dataset.remove);
        renderPanel();
        RP.Toast.show('Removed from favorites');
      });
    });
  }

  function init() {
    _load();
    _updateUI();

    /* Toggle button */
    document.getElementById('favToggle')?.addEventListener('click', () => {
      const overlay = document.getElementById('favPanelOverlay');
      const panel = document.getElementById('favPanel');
      const isHidden = overlay.hidden;
      overlay.hidden = !isHidden;
      if (isHidden) {
        renderPanel();
        panel.focus?.();
      }
    });

    /* Close panel */
    document.getElementById('favPanelClose')?.addEventListener('click', () => {
      document.getElementById('favPanelOverlay').hidden = true;
    });
    document.getElementById('favPanelOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        e.currentTarget.hidden = true;
      }
    });
  }

  return { init, has, count, all, toggle, renderPanel };
})();
