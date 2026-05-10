/* ─────────────────────────────────────────────
   RENDER.JS — Card, grid, featured, trending,
   gems, beginners, tips, criteria, avoid rendering
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Render = (() => {
  const PAGE_SIZE = 18;

  /* ── Helper: image tag ── */
  function _img(game, className = 'card-thumb-img', type = 'thumb') {
    const uid = game.universeId;
    if (!uid) return '';
    const cached = type === 'icon' ? RP.API.getIcon(uid) : RP.API.getThumb(uid);
    const src = cached ? `src="${cached}"` : '';
    const loaded = cached ? 'class="' + className + ' loaded"' : 'class="' + className + '"';
    return `<img ${src} ${loaded} data-uid="${uid}" data-imgtype="${type}" alt="${game.title}" loading="lazy" />`;
  }

  /* ── Helper: diff badge ── */
  function _diffBadge(diff) {
    const map = { easy: 'diff-easy', medium: 'diff-medium', hard: 'diff-hard', extreme: 'diff-extreme' };
    const label = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extreme' };
    return `<span class="diff-pill ${map[diff]}">${label[diff]}</span>`;
  }

  /* ── Helper: badge pill ── */
  function _badgePill(game) {
    if (!game.badge) return '';
    return `<span class="badge-pill badge-${game.badge}">${game.badgeText}</span>`;
  }

  /* ── Helper: rating class ── */
  function _ratingClass(r) {
    return r >= 90 ? 'high' : r >= 80 ? 'mid' : 'low';
  }

  /* ── GAME CARD ── */
  function gameCard(game) {
    const isFav = RP.Favorites.has(game.id);
    const mpTag = game.mp
      ? `<span class="tag tag-mp">👥 Multiplayer</span>`
      : `<span class="tag tag-solo">👤 Solo</span>`;
    const tagsHtml = game.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('') + mpTag;

    return `
      <article
        class="game-card"
        data-id="${game.id}"
        data-genre="${game.genre}"
        role="listitem"
        tabindex="0"
        aria-label="${game.title} — ${game.genre} game, rated ${game.rating}%"
      >
        <div class="card-thumb" style="background:${RP.GENRE_COLORS[game.genre]}">
          ${_img(game)}
          <span class="card-thumb-emoji" aria-hidden="true">${game.emoji}</span>
          <div class="card-thumb-overlay" aria-hidden="true"></div>
          <div class="card-badges" aria-hidden="true">${_badgePill(game)}</div>
          ${_diffBadge(game.diff)}
          <button
            class="card-fav-btn${isFav ? ' active' : ''}"
            data-id="${game.id}"
            aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${game.title}</h3>
          <div class="card-creator">by ${game.creator}</div>
          <p class="card-desc">${game.desc}</p>
          <div class="card-tags">${tagsHtml}</div>
          <div class="card-footer">
            <span class="card-rating ${_ratingClass(game.rating)}">👍 ${game.rating}%</span>
            <div class="card-footer-right">
              <span class="card-players">👥 ${game.playersLabel}</span>
              <span class="card-genre">${game.genre}</span>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* ── LIST CARD ── */
  function listCard(game) {
    const isFav = RP.Favorites.has(game.id);
    return `
      <article
        class="list-card"
        data-id="${game.id}"
        data-genre="${game.genre}"
        role="listitem"
        tabindex="0"
        aria-label="${game.title} — ${game.genre} game, rated ${game.rating}%"
      >
        <div class="list-thumb" style="background:${RP.GENRE_COLORS[game.genre]}">
          ${_img(game, 'list-thumb-img', 'thumb')}
          <span class="list-emoji" aria-hidden="true">${game.emoji}</span>
        </div>
        <div class="list-body">
          <div class="list-top">
            <div class="list-title-group">
              <h3 class="list-title">${game.title}</h3>
              <div class="list-creator">by ${game.creator}</div>
            </div>
            <div class="list-meta">
              <span class="card-rating ${_ratingClass(game.rating)}">👍 ${game.rating}%</span>
              <span class="card-players">👥 ${game.playersLabel}</span>
              ${_diffBadge(game.diff)}
              ${_badgePill(game)}
            </div>
          </div>
          <p class="list-desc">${game.desc}</p>
          <div class="list-tags">
            ${game.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
            ${game.mp ? `<span class="tag tag-mp">👥 Multiplayer</span>` : `<span class="tag tag-solo">👤 Solo</span>`}
          </div>
        </div>
        <button
          class="card-fav-btn list-fav-btn${isFav ? ' active' : ''}"
          data-id="${game.id}"
          aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
          title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
          style="opacity:1;position:relative;top:auto;left:auto;"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </article>`;
  }

  /* ── GAME GRID ── */
  let _currentPage = 1;
  let _currentList = [];
  let _currentView = 'grid';

  function setView(view) {
    _currentView = view;
  }

  function renderGrid(games) {
    _currentList = games;
    _currentPage = 1;
    const grid = document.getElementById('gameGrid');
    const empty = document.getElementById('emptyState');
    const loadWrap = document.getElementById('loadMoreWrap');
    const resultsTxt = document.getElementById('resultsText');

    if (!grid) return;

    /* Sync view class */
    grid.classList.toggle('list-view', _currentView === 'list');

    if (games.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      loadWrap.hidden = true;
      if (resultsTxt) resultsTxt.textContent = 'No results';
      return;
    }

    empty.hidden = true;
    const slice = games.slice(0, PAGE_SIZE);
    const cardFn = _currentView === 'list' ? listCard : gameCard;
    grid.innerHTML = slice.map(cardFn).join('');
    _bindCards(grid);

    loadWrap.hidden = games.length <= PAGE_SIZE;
    if (resultsTxt) {
      resultsTxt.textContent = `Showing ${Math.min(slice.length, games.length)} of ${games.length} game${games.length !== 1 ? 's' : ''}`;
    }

    RP.API.applyImages();
  }

  function loadMore() {
    const grid = document.getElementById('gameGrid');
    const loadWrap = document.getElementById('loadMoreWrap');
    if (!grid) return;

    _currentPage++;
    const start = (_currentPage - 1) * PAGE_SIZE;
    const end   = _currentPage * PAGE_SIZE;
    const slice = _currentList.slice(start, end);

    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    const cardFn = _currentView === 'list' ? listCard : gameCard;
    temp.innerHTML = slice.map(cardFn).join('');
    while (temp.firstChild) fragment.appendChild(temp.firstChild);
    grid.appendChild(fragment);

    _bindCards(grid, start);
    loadWrap.hidden = end >= _currentList.length;
    RP.API.applyImages();

    const resultsTxt = document.getElementById('resultsText');
    if (resultsTxt) {
      resultsTxt.textContent = `Showing ${Math.min(end, _currentList.length)} of ${_currentList.length} games`;
    }
  }

  function _bindCards(grid, startIdx = 0) {
    const cards = grid.querySelectorAll('.game-card');
    cards.forEach((card, i) => {
      if (i < startIdx) return;
      const game = RP.GAMES.find(g => g.id === card.dataset.id);
      if (!game) return;

      /* Open modal on card click */
      const openModal = e => {
        if (e.target.closest('.card-fav-btn')) return;
        RP.Modal.open(game);
        RP.History.push(game.id);
      };
      card.addEventListener('click', openModal);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(e); } });

      /* Favorite button */
      const favBtn = card.querySelector('.card-fav-btn');
      if (favBtn) {
        favBtn.addEventListener('click', e => {
          e.stopPropagation();
          const added = RP.Favorites.toggle(game.id);
          favBtn.classList.add('pop');
          favBtn.addEventListener('animationend', () => favBtn.classList.remove('pop'), { once: true });
          const svg = favBtn.querySelector('path');
          if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
          RP.Toast.show(added ? `Added "${game.title}" to favorites` : `Removed "${game.title}" from favorites`);
        });
      }
    });
  }

  /* ── FEATURED GRID ── */
  function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    const top = RP.GAMES.filter(g => g.featured).sort((a, b) => b.rating - a.rating).slice(0, 6);
    grid.innerHTML = top.map(g => `
      <article
        class="featured-card"
        data-id="${g.id}"
        style="background:${RP.GENRE_COLORS[g.genre]}"
        role="article"
        tabindex="0"
        aria-label="${g.title} — Top Pick"
      >
        <div class="featured-thumb">
          ${_img(g, 'feat-img', 'thumb')}
          <span class="feat-emoji" aria-hidden="true">${g.emoji}</span>
        </div>
        <div class="featured-body">
          <h3 class="featured-title">${g.title}</h3>
          <div class="featured-creator">by ${g.creator}</div>
          <p class="featured-desc">${g.desc}</p>
          <div class="featured-meta">
            <span class="feat-rating">👍 ${g.rating}%</span>
            <span class="feat-players">👥 ${g.playersLabel}</span>
            <span class="feat-genre">${g.genre}</span>
          </div>
        </div>
        <div class="feat-crown" aria-label="Top Pick">TOP PICK</div>
      </article>`).join('');

    /* Fix img class for CSS transition */
    grid.querySelectorAll('.feat-img').forEach(img => img.classList.add('featured-thumb-img') || img);

    grid.querySelectorAll('.featured-card').forEach(card => {
      const handler = () => {
        const game = RP.GAMES.find(g => g.id === card.dataset.id);
        if (game) { RP.Modal.open(game); RP.History.push(game.id); }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

    RP.API.applyImages();
  }

  /* ── TRENDING ROW ── */
  function renderTrending() {
    const row = document.getElementById('trendingRow');
    if (!row) return;

    const games = RP.GAMES.filter(g => g.trending).sort((a, b) => b.players - a.players);
    row.innerHTML = games.map(g => `
      <div class="mini-card" data-id="${g.id}" role="button" tabindex="0" aria-label="${g.title}">
        <div class="mini-thumb" style="background:${RP.GENRE_COLORS[g.genre]}">
          ${_img(g, 'mini-img', 'thumb')}
          <span class="mini-emoji" aria-hidden="true">${g.emoji}</span>
        </div>
        <div class="mini-body">
          <div class="mini-title">${g.title}</div>
          <div class="mini-rating">👍 ${g.rating}%</div>
        </div>
      </div>`).join('');

    row.querySelectorAll('.mini-card').forEach(card => {
      const handler = () => {
        const game = RP.GAMES.find(g => g.id === card.dataset.id);
        if (game) { RP.Modal.open(game); RP.History.push(game.id); }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

    RP.API.applyImages();
  }

  /* ── HIDDEN GEMS ── */
  function renderGems() {
    const grid = document.getElementById('gemsGrid');
    if (!grid) return;
    const gems = RP.GAMES.filter(g => g.gem).sort((a, b) => b.rating - a.rating);
    grid.innerHTML = gems.map(g => `
      <div class="gem-card" data-id="${g.id}" role="button" tabindex="0" aria-label="${g.title} — Hidden Gem">
        <span class="gem-emoji" aria-hidden="true">${g.emoji}</span>
        <div>
          <div class="gem-title">${g.title}</div>
          <div class="gem-desc">${g.desc.split('.')[0]}.</div>
        </div>
      </div>`).join('');

    grid.querySelectorAll('.gem-card').forEach(card => {
      const handler = () => {
        const game = RP.GAMES.find(g => g.id === card.dataset.id);
        if (game) { RP.Modal.open(game); RP.History.push(game.id); }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  /* ── BEGINNERS ROW ── */
  function renderBeginners() {
    const row = document.getElementById('beginnerRow');
    if (!row) return;
    const games = RP.GAMES.filter(g => g.beginner).sort((a, b) => b.rating - a.rating).slice(0, 10);
    row.innerHTML = games.map(g => `
      <div class="beginner-mini" data-id="${g.id}" role="button" tabindex="0" aria-label="${g.title} — beginner friendly">
        <span class="beginner-emoji" aria-hidden="true">${g.emoji}</span>
        <div>
          <div class="beginner-title">${g.title}</div>
          <div class="beginner-genre">${g.genre}</div>
        </div>
      </div>`).join('');

    row.querySelectorAll('.beginner-mini').forEach(card => {
      const handler = () => {
        const game = RP.GAMES.find(g => g.id === card.dataset.id);
        if (game) { RP.Modal.open(game); RP.History.push(game.id); }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  /* ── TIPS ── */
  function renderTips() {
    const grid = document.getElementById('tipsGrid');
    if (!grid) return;
    grid.innerHTML = RP.TIPS.map(t => `
      <div class="tip-card fade-in-observer">
        <div class="tip-icon" aria-hidden="true">${t.icon}</div>
        <h3 class="tip-title">${t.title}</h3>
        <p class="tip-body">${t.body}</p>
      </div>`).join('');
    _observeFadeIn();
  }

  /* ── CRITERIA ── */
  function renderCriteria() {
    const grid = document.getElementById('criteriaGrid');
    if (!grid) return;
    grid.innerHTML = RP.CRITERIA.map(c => `
      <div class="criterion fade-in-observer">
        <div class="criterion-icon" aria-hidden="true">${c.icon}</div>
        <div class="criterion-title">${c.title}</div>
        <div class="criterion-desc">${c.desc}</div>
      </div>`).join('');
    _observeFadeIn();
  }

  /* ── AVOID ── */
  function renderAvoid() {
    const grid = document.getElementById('avoidGrid');
    if (!grid) return;
    grid.innerHTML = RP.AVOID.map(a => `
      <div class="avoid-item fade-in-observer">
        <span class="avoid-icon" aria-hidden="true">${a.icon}</span>
        <div>
          <div class="avoid-title">${a.title}</div>
          <div class="avoid-desc">${a.desc}</div>
        </div>
      </div>`).join('');
    _observeFadeIn();
  }

  /* ── Intersection observer for fade-in ── */
  function _observeFadeIn() {
    if (!window.IntersectionObserver) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in-observer:not(.visible)').forEach(el => obs.observe(el));
  }

  /* ── Genre filter counts ── */
  function updateCounts(list) {
    const genres = ['fps','adventure','roleplay','horror','tycoon','platformer','social','strategy','racing','sports','building'];
    const el = document.getElementById('cnt-all');
    if (el) el.textContent = list.length;
    genres.forEach(g => {
      const e = document.getElementById('cnt-' + g);
      if (e) e.textContent = list.filter(x => x.genre === g).length;
    });
  }

  return {
    gameCard,
    listCard,
    renderGrid,
    loadMore,
    setView,
    renderFeatured,
    renderTrending,
    renderGems,
    renderBeginners,
    renderTips,
    renderCriteria,
    renderAvoid,
    updateCounts,
  };
})();
