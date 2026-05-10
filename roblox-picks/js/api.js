/* ─────────────────────────────────────────────
   API.JS — Roblox thumbnail fetching with cache
   Uses thumbnails.roblox.com (CORS-enabled)
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.API = (() => {
  const CACHE_KEY = 'rp_thumb_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const BATCH_SIZE = 30;
  const THUMB_SIZE = '768x432';
  const ICON_SIZE  = '512x512';

  /* Load persistent cache */
  let _cache = {};
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.ts < CACHE_TTL) {
        _cache = parsed.data;
      }
    }
  } catch (_) {}

  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: _cache }));
    } catch (_) {}
  }

  /* Fetch game thumbnails (landscape 16:9) for a batch of universe IDs */
  async function fetchThumbnails(universeIds) {
    const uncached = universeIds.filter(id => id && !_cache[id]);
    if (uncached.length === 0) return _cache;

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const url = `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${batch.join(',')}&countPerUniverse=1&size=${THUMB_SIZE}&format=Png&isCircular=false`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const json = await res.json();
        if (json.data) {
          for (const item of json.data) {
            if (item.thumbnails?.[0]?.imageUrl) {
              _cache[item.universeId] = {
                thumb: item.thumbnails[0].imageUrl,
                icon: null,
              };
            }
          }
        }
      } catch (_) { /* Network failed, skip gracefully */ }
    }

    /* Fetch icons (square) for any that only got a thumb */
    const needIcon = uncached.filter(id => _cache[id] && !_cache[id].icon);
    if (needIcon.length > 0) {
      for (let i = 0; i < needIcon.length; i += BATCH_SIZE) {
        const batch = needIcon.slice(i, i + BATCH_SIZE);
        const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${batch.join(',')}&size=${ICON_SIZE}&format=Png&isCircular=false`;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;
          const json = await res.json();
          if (json.data) {
            for (const item of json.data) {
              if (item.imageUrl && _cache[item.targetId]) {
                _cache[item.targetId].icon = item.imageUrl;
              }
            }
          }
        } catch (_) {}
      }
    }

    _saveCache();
    return _cache;
  }

  /* Get cached thumbnail for a universe ID */
  function getThumb(universeId) {
    return _cache[universeId]?.thumb || null;
  }

  function getIcon(universeId) {
    return _cache[universeId]?.icon || null;
  }

  /* Apply images to all img elements that have data-uid attribute */
  function applyImages() {
    document.querySelectorAll('img[data-uid]').forEach(img => {
      const uid = parseInt(img.dataset.uid);
      const type = img.dataset.imgtype || 'thumb';
      const url = type === 'icon' ? getIcon(uid) : getThumb(uid);
      if (url && img.src !== url) {
        img.src = url;
        img.onload = () => img.classList.add('loaded');
        img.onerror = () => img.style.display = 'none';
      }
    });
  }

  /* Main init — fetch all thumbnails for known universe IDs */
  async function init() {
    const ids = RP.GAMES
      .filter(g => g.universeId)
      .map(g => g.universeId);

    if (ids.length === 0) return;

    await fetchThumbnails(ids);
    applyImages();
  }

  return { init, getThumb, getIcon, applyImages };
})();
