/* ─────────────────────────────────────────────
   DAILY.JS — Game of the Day + Random Picker
   Deterministic daily pick based on date hash
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Daily = (() => {
  /* Deterministic hash from today's date — same result all day */
  function _dayHash() {
    const d = new Date();
    const s = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  }

  function getGameOfDay() {
    const pool = RP.GAMES.filter(g => g.rating >= 87);
    return pool[_dayHash() % pool.length];
  }

  function getRandom() {
    return RP.GAMES[Math.floor(Math.random() * RP.GAMES.length)];
  }

  function renderGameOfDay() {
    const el = document.getElementById('gameDayCard');
    if (!el) return;

    const game = getGameOfDay();
    if (!game) return;

    const uid = game.universeId;
    const thumbUrl = uid ? RP.API.getThumb(uid) : null;

    el.innerHTML = `
      <div class="gotd-thumb" style="background:${RP.GENRE_COLORS[game.genre]}">
        ${thumbUrl
          ? `<img src="${thumbUrl}" alt="${game.title}" class="gotd-img loaded" />`
          : `<img data-uid="${uid || ''}" data-imgtype="thumb" alt="${game.title}" class="gotd-img" />`
        }
        <span class="gotd-emoji" aria-hidden="true">${game.emoji}</span>
        <div class="gotd-overlay" aria-hidden="true"></div>
        <div class="gotd-badge-wrap">
          <span class="gotd-badge">TODAY'S PICK</span>
          <span class="gotd-date">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
      <div class="gotd-body">
        <div class="gotd-genre-row">
          <span class="card-genre" style="font-size:11px;padding:2px 8px;">${game.genre}</span>
          ${game.badge ? `<span class="badge-pill badge-${game.badge}">${game.badgeText}</span>` : ''}
        </div>
        <h3 class="gotd-title">${game.title}</h3>
        <div class="gotd-creator">by ${game.creator}</div>
        <p class="gotd-desc">${game.desc}</p>
        <div class="gotd-stats">
          <span class="card-rating ${game.rating >= 90 ? 'high' : game.rating >= 80 ? 'mid' : 'low'}">👍 ${game.rating}%</span>
          <span class="card-players">👥 ${game.playersLabel}</span>
          <span class="diff-pill diff-${game.diff}" style="position:static;padding:2px 10px;font-size:10px;">${game.diff}</span>
        </div>
        <div class="gotd-actions">
          <button class="btn-primary gotd-open-btn" data-id="${game.id}">
            View Details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          ${game.placeId
            ? `<a class="btn-ghost gotd-play-btn" href="https://www.roblox.com/games/${game.placeId}" target="_blank" rel="noopener noreferrer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play Now
              </a>`
            : ''
          }
        </div>
      </div>`;

    el.querySelector('.gotd-open-btn')?.addEventListener('click', () => {
      RP.Modal.open(game);
      RP.History.push(game.id);
    });

    RP.API.applyImages();
  }

  function initRandomBtn() {
    document.getElementById('randomPickBtn')?.addEventListener('click', () => {
      const game = getRandom();
      RP.Modal.open(game);
      RP.History.push(game.id);
      RP.Toast.show(`🎲 Random pick: ${game.title}`);
    });
  }

  function init() {
    renderGameOfDay();
    initRandomBtn();
  }

  return { init, getGameOfDay, getRandom, renderGameOfDay };
})();
