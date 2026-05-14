/* ─────────────────────────────────────────────
   BROWSE.JS — Live Roblox Charts
   Fetches live player counts from Roblox API and
   renders a "What's Hot Right Now" section.
   Falls back to static popularity data if CORS blocks.
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Browse = (() => {

  /* Top universe IDs (most popular games on Roblox, June 2026) */
  const CHART_UNIVERSE_IDS = [
    // Mega-popular
    2753915549,  // Blox Fruits
    606849621,   // Jailbreak
    1537690962,  // Adopt Me
    2959066224,  // Loomian Legacy
    3272915504,  // Arcane Odyssey
    4922618665,  // Grand Piece Online
    6104508740,  // Funky Friday
    3923291407,  // Tower Defense Simulator
    2414851778,  // Dungeon Quest
    738689993,   // Flood Escape 2
    // FPS
    286090429,   // Arsenal
    3505620382,  // Bad Business
    4872321990,  // Islands
    // Adventure / RPG
    2908283285,  // Vesteria
    3414776548,  // World Zero
    5003891781,  // Shindo Life
    // Social
    1011492733,  // Roblox High School 2
    // Racing / Sports
    234218681,   // Vehicle Simulator
    2953524856,  // Super Striker League
    // Tycoon
    69184822,    // Theme Park Tycoon 2
    2716594610,  // Restaurant Tycoon 2
    155615604,   // Prison Life
    // Horror
    6245582125,  // The Mimic
    4607210426,  // Piggy
    // Classic
    189,         // Natural Disaster Survival
    7995581,     // Speed Run 4
  ];

  /* Static fallback data for when Roblox API is unavailable (CORS) */
  const STATIC_CHARTS = [
    { universeId: 2753915549, name: 'Blox Fruits', players: 198000, placeId: 2753915549 },
    { universeId: 606849621,  name: 'Jailbreak',   players: 78000,  placeId: 606849621 },
    { universeId: 1537690962, name: 'Adopt Me!',   players: 148000, placeId: 1537690962 },
    { universeId: 5003891781, name: 'Shindo Life', players: 35000,  placeId: 5003891781 },
    { universeId: 3272915504, name: 'Arcane Odyssey', players: 19000, placeId: 3272915504 },
    { universeId: 4922618665, name: 'Grand Piece Online', players: 18000, placeId: 4922618665 },
    { universeId: 6104508740, name: 'Funky Friday', players: 20000, placeId: 6104508740 },
    { universeId: 3923291407, name: 'Tower Defense Simulator', players: 25000, placeId: 3923291407 },
    { universeId: 2414851778, name: 'Dungeon Quest', players: 14000, placeId: 2414851778 },
    { universeId: 3505620382, name: 'Bad Business', players: 15000, placeId: 3505620382 },
    { universeId: 2908283285, name: 'Vesteria',    players: 6000,   placeId: 2908283285 },
    { universeId: 3414776548, name: 'World // Zero', players: 9000, placeId: 3414776548 },
    { universeId: 6245582125, name: 'The Mimic',   players: 11000,  placeId: 6245582125 },
    { universeId: 4607210426, name: 'Piggy',       players: 9000,   placeId: 4607210426 },
    { universeId: 69184822,   name: 'Theme Park Tycoon 2', players: 18000, placeId: 69184822 },
    { universeId: 2716594610, name: 'Restaurant Tycoon 2', players: 11000, placeId: 2716594610 },
    { universeId: 155615604,  name: 'Prison Life',  players: 16000,  placeId: 155615604 },
    { universeId: 738689993,  name: 'Flood Escape 2', players: 9000, placeId: 738689993 },
    { universeId: 7995581,    name: 'Speed Run 4',  players: 7000,   placeId: 7995581 },
    { universeId: 286090429,  name: 'Arsenal',      players: 22000,  placeId: 286090429 },
  ];

  function _formatPlayers(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  }

  function _renderCharts(games) {
    const container = document.getElementById('liveChartsGrid');
    if (!container) return;

    container.innerHTML = games
      .sort((a, b) => b.players - a.players)
      .slice(0, 20)
      .map((g, i) => {
        const placeLink = g.placeId
          ? `https://www.roblox.com/games/${g.placeId}`
          : `https://www.roblox.com/`;
        const curated = RP.GAMES.find(cg => cg.universeId === g.universeId || cg.title.toLowerCase().includes(g.name.toLowerCase().split(' ')[0]));
        const badge = curated ? `<span class="chart-curated-badge">✓ Curated</span>` : '';
        return `
          <a href="${placeLink}" target="_blank" rel="noopener noreferrer" class="chart-card" aria-label="Play ${g.name} on Roblox">
            <span class="chart-rank">#${i + 1}</span>
            <div class="chart-info">
              <span class="chart-name">${g.name}</span>
              ${badge}
            </div>
            <span class="chart-players">
              <span class="chart-dot"></span>
              ${_formatPlayers(g.players)} playing
            </span>
          </a>
        `;
      }).join('');
  }

  async function _fetchLive() {
    const ids = CHART_UNIVERSE_IDS.slice(0, 26).join(',');
    const url = `https://games.roblox.com/v1/games?universeIds=${ids}`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('non-ok');
      const data = await res.json();
      if (!data.data || !data.data.length) throw new Error('empty');
      return data.data.map(g => ({
        universeId: g.id,
        name: g.name,
        players: g.playing || 0,
        placeId: g.rootPlaceId,
      }));
    } catch {
      return null;
    }
  }

  async function init() {
    const section = document.getElementById('live-charts');
    if (!section) return;

    /* Show skeleton while loading */
    const grid = document.getElementById('liveChartsGrid');
    if (grid) {
      grid.innerHTML = Array(10).fill(0).map(() =>
        `<div class="chart-card chart-skeleton"></div>`
      ).join('');
    }

    const live = await _fetchLive();
    if (live && live.length > 0) {
      _renderCharts(live);
      const stamp = document.getElementById('chartsTimestamp');
      if (stamp) stamp.textContent = 'Live data • updated just now';
    } else {
      _renderCharts(STATIC_CHARTS);
      const stamp = document.getElementById('chartsTimestamp');
      if (stamp) stamp.textContent = 'Estimated popularity (live API unavailable)';
    }
  }

  return { init };
})();
