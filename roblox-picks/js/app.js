/* ─────────────────────────────────────────────
   APP.JS — Main controller
   Wires up all modules, manages filter/sort state,
   initializes everything on DOMContentLoaded
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

/* ── Toast utility ── */
RP.Toast = (() => {
  let _timer = null;

  function show(msg, type = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast${type ? ' toast-' + type : ''}`;
    toast.textContent = msg;
    container.appendChild(toast);

    clearTimeout(_timer);
    _timer = setTimeout(() => {
      toast.style.animation = 'toastOut 0.25s ease forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, 2500);
  }

  return { show };
})();

/* ── App state ── */
const _state = {
  genre: 'all',
  query: '',
  sort: 'rating',
  filterFavs: false,
  filterBeginners: false,
  filterMP: false,
  filterGems: false,
};

/* ── Sort comparators ── */
const SORTERS = {
  rating:          (a, b) => b.rating - a.rating,
  players:         (a, b) => b.players - a.players,
  name:            (a, b) => a.title.localeCompare(b.title),
  newest:          (a, b) => b.year - a.year,
  difficulty_asc:  (a, b) => _diffVal(a.diff) - _diffVal(b.diff),
  difficulty_desc: (a, b) => _diffVal(b.diff) - _diffVal(a.diff),
};

function _diffVal(d) {
  return { easy: 1, medium: 2, hard: 3, extreme: 4 }[d] || 2;
}

/* ── Get filtered + sorted list ── */
function _getList() {
  let list = RP.Search.filter(_state.query, RP.GAMES);

  if (_state.genre !== 'all') {
    list = list.filter(g => g.genre === _state.genre);
  }
  if (_state.filterFavs) {
    const ids = new Set(RP.Favorites.all());
    list = list.filter(g => ids.has(g.id));
  }
  if (_state.filterBeginners) {
    list = list.filter(g => g.beginner);
  }
  if (_state.filterMP) {
    list = list.filter(g => g.mp);
  }
  if (_state.filterGems) {
    list = list.filter(g => g.gem);
  }

  list = [...list].sort(SORTERS[_state.sort] || SORTERS.rating);
  return list;
}

/* ── Refresh the game grid ── */
function _refresh() {
  const list = _getList();
  RP.Render.renderGrid(list);
  RP.Render.updateCounts(list);

  /* Show/hide clear-filters button */
  const hasFilter = _state.genre !== 'all' || _state.query || _state.filterFavs || _state.filterBeginners || _state.filterMP || _state.filterGems;
  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) clearBtn.hidden = !hasFilter;
}

/* ── Filter bar ── */
function _initFilters() {
  document.getElementById('filterBar')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    _state.genre = btn.dataset.genre;
    _refresh();
  });

  /* Sub-filter checkboxes */
  document.getElementById('filterFavorites')?.addEventListener('change', e => {
    _state.filterFavs = e.target.checked;
    _refresh();
  });
  document.getElementById('filterBeginners')?.addEventListener('change', e => {
    _state.filterBeginners = e.target.checked;
    _refresh();
  });
  document.getElementById('filterMultiplayer')?.addEventListener('change', e => {
    _state.filterMP = e.target.checked;
    _refresh();
  });
  document.getElementById('filterGems')?.addEventListener('change', e => {
    _state.filterGems = e.target.checked;
    _refresh();
  });

  /* Sort */
  document.getElementById('sortSelect')?.addEventListener('change', e => {
    _state.sort = e.target.value;
    _refresh();
  });

  /* Clear filters */
  document.getElementById('clearFilters')?.addEventListener('click', _clearAll);
  document.getElementById('emptyReset')?.addEventListener('click', _clearAll);
}

function _clearAll() {
  _state.genre = 'all';
  _state.query = '';
  _state.filterFavs = false;
  _state.filterBeginners = false;
  _state.filterMP = false;
  _state.filterGems = false;

  /* Clear mood chip selection */
  document.querySelectorAll('.mood-chip').forEach(b => b.classList.remove('active'));

  /* Reset UI */
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  document.querySelector('.filter-btn[data-genre="all"]')?.classList.add('active');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').hidden = true;
  document.getElementById('filterFavorites').checked = false;
  document.getElementById('filterBeginners').checked = false;
  document.getElementById('filterMultiplayer').checked = false;
  document.getElementById('filterGems').checked = false;
  document.getElementById('sortSelect').value = 'rating';
  _state.sort = 'rating';
  _refresh();
}

/* ── Search ── */
function _initSearch() {
  RP.Search.initUI(query => {
    _state.query = query;
    _refresh();
  });
}

/* ── View Toggle ── */
function _initViewToggle() {
  document.getElementById('viewToggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b === btn));
    RP.Render.setView(view);
    _refresh();
  });
}

/* ── Mood Selector ── */
function _initMoodSelector() {
  document.getElementById('moodSelector')?.addEventListener('click', e => {
    const btn = e.target.closest('.mood-chip');
    if (!btn) return;
    const mood = btn.dataset.mood;
    const isActive = btn.classList.contains('active');

    /* Toggle — clicking active chip clears it */
    document.querySelectorAll('.mood-chip').forEach(b => b.classList.remove('active'));
    if (!isActive) {
      btn.classList.add('active');
      _applyMood(mood);
    } else {
      _clearAll();
    }
  });
}

function _applyMood(mood) {
  /* Reset filters first, keep sort */
  _state.genre = 'all';
  _state.query = '';
  _state.filterFavs = false;
  _state.filterBeginners = false;
  _state.filterMP = false;
  _state.filterGems = false;

  /* Reset UI elements */
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  document.querySelector('.filter-btn[data-genre="all"]')?.classList.add('active');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').hidden = true;
  document.getElementById('filterFavorites').checked = false;
  document.getElementById('filterBeginners').checked = false;
  document.getElementById('filterMultiplayer').checked = false;
  document.getElementById('filterGems').checked = false;

  switch (mood) {
    case 'horror':
      _state.genre = 'horror';
      document.querySelector('.filter-btn[data-genre="horror"]')?.classList.add('active');
      document.querySelector('.filter-btn[data-genre="all"]')?.classList.remove('active');
      break;
    case 'competitive':
      _state.filterMP = true;
      _state.sort = 'players';
      document.getElementById('filterMultiplayer').checked = true;
      document.getElementById('sortSelect').value = 'players';
      break;
    case 'chill':
      _state.filterBeginners = true;
      _state.sort = 'rating';
      document.getElementById('filterBeginners').checked = true;
      break;
    case 'friends':
      _state.filterMP = true;
      document.getElementById('filterMultiplayer').checked = true;
      break;
    case 'gems':
      _state.filterGems = true;
      document.getElementById('filterGems').checked = true;
      break;
    case 'story':
      _state.genre = 'adventure';
      document.querySelector('.filter-btn[data-genre="adventure"]')?.classList.add('active');
      document.querySelector('.filter-btn[data-genre="all"]')?.classList.remove('active');
      break;
    case 'anime':
      _state.query = 'anime';
      document.getElementById('searchInput').value = 'anime';
      document.getElementById('searchClear').hidden = false;
      break;
    case 'racing':
      _state.genre = 'racing';
      document.querySelector('.filter-btn[data-genre="racing"]')?.classList.add('active');
      document.querySelector('.filter-btn[data-genre="all"]')?.classList.remove('active');
      break;
  }
  _refresh();
}

/* ── Load More ── */
function _initLoadMore() {
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    RP.Render.loadMore();
  });
}

/* ── Back to top ── */
function _initBackTop() {
  const btn = document.getElementById('backTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 400;
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Smooth nav link scroll ── */
function _initNavLinks() {
  document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Active nav highlight on scroll */
  const sections = ['featured', 'all-games', 'gems', 'tips', 'avoid'];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.nav-link').forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: `-${64}px 0px 0px 0px` });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

/* ── Stats counter animation ── */
function _animateCount(el, target, duration = 800) {
  if (!el) return;
  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

function _initStatsAnimation() {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      _animateCount(document.getElementById('statGames'), RP.GAMES.length);
      obs.disconnect();
    }
  });
  const statsEl = document.querySelector('.stats-section');
  if (statsEl) obs.observe(statsEl);
}

/* ── Keyboard shortcut: / to focus search ── */
function _initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    }
    if (e.key === 'f' && e.ctrlKey && !e.target.matches('input, textarea')) {
      e.preventDefault();
      RP.Chat.toggle();
    }
  });
}

/* ── Main init ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Render static sections immediately
  RP.Render.renderFeatured();
  RP.Render.renderTrending();
  RP.Render.renderGems();
  RP.Render.renderBeginners();
  RP.Render.renderTips();
  RP.Render.renderCriteria();
  RP.Render.renderAvoid();

  // Populate genre explorer counts
  const GENRES = ['fps','adventure','roleplay','horror','tycoon','platformer','social','strategy','racing','sports','building'];
  GENRES.forEach(g => {
    const cnt = RP.GAMES.filter(x => x.genre === g).length;
    const el = document.getElementById('gc-' + g);
    if (el) el.textContent = cnt + ' games';
  });

  // Init modules
  RP.Favorites.init();
  RP.History.init();
  RP.Modal.init();
  RP.Chat.init();

  // Render game grid (removes skeletons)
  _refresh();

  // Wire up controls
  _initFilters();
  _initSearch();
  _initLoadMore();
  _initBackTop();
  _initNavLinks();
  _initStatsAnimation();
  _initKeyboard();
  _initViewToggle();
  _initMoodSelector();

  // Game of the Day + Random Pick
  RP.Daily.init();

  // Live Roblox Charts (non-blocking)
  if (RP.Browse) RP.Browse.init();

  // Search on Roblox button
  document.getElementById('searchRobloxBtn')?.addEventListener('click', () => {
    const q = document.getElementById('searchInput')?.value.trim();
    const url = q
      ? `https://www.roblox.com/games?keyword=${encodeURIComponent(q)}`
      : 'https://www.roblox.com/games';
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  // Fetch Roblox thumbnails in the background (non-blocking)
  RP.API.init().then(() => {
    RP.API.applyImages();
    // Re-render sections to show images
    RP.Render.renderFeatured();
    RP.Render.renderTrending();
    RP.History.init();
    RP.Daily.renderGameOfDay();
    _refresh();
  });

  // Quick tip in console for devs
  console.log(
    '%c RobloxPicks %c v1.0 ',
    'background:#e8392c;color:white;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold',
    'background:#1a1a2a;color:#f0f0f8;padding:4px 8px;border-radius:0 4px 4px 0',
  );
  console.log(`%c ${RP.GAMES.length} curated games loaded. Press / to search, Ctrl+F to open AI chat. Today's pick: ${RP.Daily.getGameOfDay()?.title}`, 'color:#8888aa');
});
