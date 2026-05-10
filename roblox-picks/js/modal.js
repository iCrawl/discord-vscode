/* ─────────────────────────────────────────────
   MODAL.JS — Game detail modal with full info,
   star rating, similar games, favorites
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Modal = (() => {
  const KEY_RATINGS = 'rp_user_ratings';
  let _ratings = {};
  let _currentGame = null;

  function _loadRatings() {
    try {
      const s = localStorage.getItem(KEY_RATINGS);
      if (s) _ratings = JSON.parse(s);
    } catch (_) {}
  }

  function _saveRatings() {
    try {
      localStorage.setItem(KEY_RATINGS, JSON.stringify(_ratings));
    } catch (_) {}
  }

  function _ratingLabel(stars) {
    return ['', 'Terrible', 'Meh', 'Pretty good', 'Great!', 'Amazing!'][stars] || '';
  }

  function _diffLabel(diff) {
    const m = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard', extreme: '💀 Extreme' };
    return m[diff] || diff;
  }

  function _buildContent(game) {
    const uid = game.universeId;
    const thumbUrl = uid ? RP.API.getThumb(uid) : null;
    const isFav = RP.Favorites.has(game.id);
    const userRating = _ratings[game.id] || 0;

    /* Similar games (same genre, different game) */
    const similar = RP.GAMES
      .filter(g => g.genre === game.genre && g.id !== game.id)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    const modesHtml = game.modes?.length
      ? `<div class="modal-section-label">Game Modes</div>
         <div class="modal-tags">${game.modes.map(m => `<span class="chip chip-blue">${m}</span>`).join('')}</div>`
      : '';

    const tagsHtml = game.tags.length
      ? `<div class="modal-section-label">Tags</div>
         <div class="modal-tags">${game.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
      : '';

    const starsHtml = [1,2,3,4,5].map(n => `
      <button class="star${userRating >= n ? ' active' : ''}" data-star="${n}" aria-label="Rate ${n} stars" title="${_ratingLabel(n)}">⭐</button>
    `).join('');

    const robloxLink = game.placeId
      ? `<a class="modal-roblox-link" href="https://www.roblox.com/games/${game.placeId}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Play on Roblox
        </a>`
      : '';

    const similarHtml = similar.length
      ? `<div class="modal-section-label">Similar Games</div>
         <div class="similar-grid">
           ${similar.map(g => `
             <div class="similar-card" data-id="${g.id}" role="button" tabindex="0" aria-label="Open ${g.title}">
               <span class="similar-emoji">${g.emoji}</span>
               <div>
                 <div class="similar-name">${g.title}</div>
                 <div style="font-size:10px;color:var(--text-3)">${g.genre}</div>
               </div>
             </div>`).join('')}
         </div>`
      : '';

    return `
      <div class="modal-hero">
        ${thumbUrl
          ? `<img src="${thumbUrl}" alt="${game.title}" class="loaded" />`
          : `<img data-uid="${uid || ''}" data-imgtype="thumb" alt="${game.title}" />`
        }
        <span class="modal-emoji" aria-hidden="true">${game.emoji}</span>
        <div class="modal-hero-overlay" aria-hidden="true"></div>
      </div>

      <div class="modal-header">
        <div class="modal-title-row">
          <div>
            <h2 class="modal-title" id="modalTitle">${game.title}</h2>
            <div class="modal-creator">by ${game.creator}</div>
          </div>
          <button
            class="icon-btn${isFav ? ' active' : ''}"
            id="modalFavBtn"
            data-id="${game.id}"
            aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div class="modal-stat-row">
          <div class="modal-stat">
            <div class="modal-stat-val green">👍 ${game.rating}%</div>
            <div class="modal-stat-lbl">Approval Rate</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-val blue">👥 ${game.playersLabel}</div>
            <div class="modal-stat-lbl">Active Players</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-val">${_diffLabel(game.diff)}</div>
            <div class="modal-stat-lbl">Difficulty</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-val gold">${game.year}</div>
            <div class="modal-stat-lbl">Released</div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
          ${game.badge ? `<span class="badge-pill badge-${game.badge}">${game.badgeText}</span>` : ''}
          ${game.gem ? `<span class="badge-pill badge-gem">💎 Hidden Gem</span>` : ''}
          ${game.beginner ? `<span class="chip chip-green">🌱 Beginner Friendly</span>` : ''}
          ${game.mp ? `<span class="chip chip-blue">👥 Multiplayer</span>` : `<span class="chip chip-purple">👤 Solo</span>`}
        </div>
      </div>

      <div class="modal-body">
        <p class="modal-desc">${game.fullDesc || game.desc}</p>

        ${modesHtml}
        ${tagsHtml}

        <div class="modal-section-label">Your Rating</div>
        <div class="star-rating" id="modalStars" aria-label="Rate this game">
          ${starsHtml}
          <span class="star-label" id="starLabel">${userRating ? _ratingLabel(userRating) : 'Tap to rate'}</span>
        </div>

        ${similarHtml}

        ${robloxLink}
      </div>`;
  }

  function open(game) {
    _currentGame = game;
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!overlay || !content) return;

    content.innerHTML = _buildContent(game);
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    /* Apply thumbnail if not loaded */
    RP.API.applyImages();

    /* Star rating */
    const starsEl = document.getElementById('modalStars');
    const starLabel = document.getElementById('starLabel');
    starsEl?.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', () => {
        const n = parseInt(star.dataset.star);
        _ratings[game.id] = n;
        _saveRatings();
        starsEl.querySelectorAll('.star').forEach((s, i) => {
          s.classList.toggle('active', i < n);
        });
        if (starLabel) starLabel.textContent = _ratingLabel(n);
        RP.Toast.show(`You rated "${game.title}" ${n}/5 stars`);
      });

      /* Preview on hover */
      star.addEventListener('mouseenter', () => {
        const n = parseInt(star.dataset.star);
        starsEl.querySelectorAll('.star').forEach((s, i) => {
          s.style.filter = i < n ? 'none' : 'grayscale(1) opacity(0.4)';
        });
        if (starLabel) starLabel.textContent = _ratingLabel(n);
      });
      star.addEventListener('mouseleave', () => {
        const cur = _ratings[game.id] || 0;
        starsEl.querySelectorAll('.star').forEach((s, i) => {
          s.style.filter = i < cur ? 'none' : 'grayscale(1) opacity(0.4)';
        });
        if (starLabel) starLabel.textContent = cur ? _ratingLabel(cur) : 'Tap to rate';
      });
    });

    /* Favorite button */
    document.getElementById('modalFavBtn')?.addEventListener('click', function() {
      const added = RP.Favorites.toggle(game.id);
      this.classList.toggle('active', added);
      const svg = this.querySelector('path');
      if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
      RP.Toast.show(added ? `Added "${game.title}" to favorites` : `Removed "${game.title}"`);
    });

    /* Similar game clicks */
    content.querySelectorAll('.similar-card').forEach(card => {
      const handler = () => {
        const g = RP.GAMES.find(x => x.id === card.dataset.id);
        if (g) { open(g); RP.History.push(g.id); }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

    /* Trap focus */
    setTimeout(() => document.getElementById('modalClose')?.focus(), 50);
  }

  function close() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.hidden = true;
    document.body.style.overflow = '';
    _currentGame = null;
  }

  function init() {
    _loadRatings();

    document.getElementById('modalClose')?.addEventListener('click', close);
    document.getElementById('modalOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });

    /* ESC key */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  return { init, open, close };
})();
