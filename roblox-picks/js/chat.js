/* ─────────────────────────────────────────────
   CHAT.JS — AI Game Advisor
   Rule-based NLP with game recommendations,
   contextual responses, and suggestions
   ───────────────────────────────────────────── */

window.RP = window.RP || {};

RP.Chat = (() => {
  let _open = false;
  let _context = { lastGenre: null, lastGame: null, messageCount: 0 };

  /* ── Intent matchers ── */
  const INTENTS = [
    {
      name: 'greeting',
      patterns: [/^(hi|hello|hey|yo|sup|hiya|howdy|heya)\b/i],
      respond: () => _greet(),
    },
    {
      name: 'best_game',
      patterns: [/best game/i, /what should i play/i, /recommend/i, /what('s| is) good/i, /top game/i, /suggest/i],
      respond: () => _recommendTop(),
    },
    {
      name: 'fps',
      patterns: [/fps|first.person|shooting|gun|sniper|aim/i],
      respond: () => _recommendGenre('fps'),
    },
    {
      name: 'horror',
      patterns: [/horror|scary|terrify|fear|spook|creep|jumpscare|afraid|haunted/i],
      respond: () => _recommendGenre('horror'),
    },
    {
      name: 'adventure',
      patterns: [/adventure|rpg|quest|story|explore|open.world|mmorpg/i],
      respond: () => _recommendGenre('adventure'),
    },
    {
      name: 'roleplay',
      patterns: [/roleplay|rp|role.play|town|city|life sim|life simulator/i],
      respond: () => _recommendGenre('roleplay'),
    },
    {
      name: 'tycoon',
      patterns: [/tycoon|manage|build.a|business|economy|shop|store/i],
      respond: () => _recommendGenre('tycoon'),
    },
    {
      name: 'platformer',
      patterns: [/platformer|obby|jump|obstacle|platform|parkour/i],
      respond: () => _recommendGenre('platformer'),
    },
    {
      name: 'social',
      patterns: [/social|party|friends|mini.?game|fun with|group/i],
      respond: () => _recommendGenre('social'),
    },
    {
      name: 'strategy',
      patterns: [/strategy|tower.def|tactic|rts|craft|survival|build/i],
      respond: () => _recommendGenre('strategy'),
    },
    {
      name: 'racing',
      patterns: [/racing|race|car|drive|kart|vehicle/i],
      respond: () => _recommendGenre('racing'),
    },
    {
      name: 'sports',
      patterns: [/sport|football|soccer|basketball|tennis|fencing/i],
      respond: () => _recommendGenre('sports'),
    },
    {
      name: 'building',
      patterns: [/building|build|house|construct|design|lumber/i],
      respond: () => _recommendGenre('building'),
    },
    {
      name: 'beginner',
      patterns: [/beginner|easy|new.?(to|at)|just.start|newbie|noob|simple|for kids/i],
      respond: () => _recommendBeginner(),
    },
    {
      name: 'hard',
      patterns: [/hard|challenge|difficult|expert|pro|extreme|permadeath/i],
      respond: () => _recommendHard(),
    },
    {
      name: 'solo',
      patterns: [/solo|alone|single.?player|by myself/i],
      respond: () => _recommendSolo(),
    },
    {
      name: 'multiplayer',
      patterns: [/multi.?player|with friends|together|co.?op|party/i],
      respond: () => _recommendMP(),
    },
    {
      name: 'gems',
      patterns: [/hidden.?gem|underrated|unknown|lesser.?known|not popular/i],
      respond: () => _recommendGems(),
    },
    {
      name: 'brainrot',
      patterns: [/brainrot|brain.?rot|what.*(avoid|skip)|bad game|avoid/i],
      respond: () => _explainBrainrot(),
    },
    {
      name: 'about_game',
      patterns: [/what is|tell me about|info on|about|describe/i],
      respond: (input) => _describeGame(input),
    },
    {
      name: 'similar',
      patterns: [/similar to|like .+|games like|something like/i],
      respond: (input) => _findSimilar(input),
    },
    {
      name: 'anime',
      patterns: [/anime|manga|japanese|one piece|demon.?slayer|jojo/i],
      respond: () => _recommendAnime(),
    },
    {
      name: 'scary',
      patterns: [/scare me|most scary|scariest|terrifying/i],
      respond: () => _recommendGenre('horror'),
    },
    {
      name: 'classic',
      patterns: [/classic|old|original|veteran|og|nostalgia/i],
      respond: () => _recommendClassics(),
    },
    {
      name: 'new',
      patterns: [/new|newest|recent|latest|2024|2023/i],
      respond: () => _recommendNew(),
    },
    {
      name: 'help',
      patterns: [/help|what can you|how do you|what do you/i],
      respond: () => _showHelp(),
    },
    {
      name: 'thanks',
      patterns: [/(thank|thx|ty|thanks|appreciate|nice|cool|awesome|great|wow)/i],
      respond: () => _thanks(),
    },
  ];

  /* ── Response builders ── */
  function _greet() {
    const greets = [
      "Hey! 👋 I'm your RobloxPicks AI Advisor. Tell me what kind of games you enjoy and I'll find the perfect match!",
      "Hi there! 🎮 Ready to find your next favorite Roblox game? Tell me your vibe — horror, FPS, RPG, racing?",
      "Hello! I know every quality Roblox game on this site. Ask me anything — genre, difficulty, vibe, I've got you.",
    ];
    return { text: greets[Math.floor(Math.random() * greets.length)] };
  }

  function _recommendTop() {
    const picks = RP.GAMES.filter(g => g.badge === 'quality').sort((a, b) => b.rating - a.rating).slice(0, 4);
    return {
      text: "Here are the absolute best games on the platform right now — curated by quality, not popularity:",
      games: picks,
    };
  }

  function _recommendGenre(genre) {
    _context.lastGenre = genre;
    const games = RP.GAMES.filter(g => g.genre === genre).sort((a, b) => b.rating - a.rating).slice(0, 4);
    const labels = {
      fps: 'FPS / Combat',
      horror: 'Horror',
      adventure: 'Adventure / RPG',
      roleplay: 'Roleplay',
      tycoon: 'Tycoon / Management',
      platformer: 'Platformer / Obby',
      social: 'Social / Party',
      strategy: 'Strategy / Survival',
      racing: 'Racing',
      sports: 'Sports',
      building: 'Building / Creative',
    };
    return {
      text: `Top ${labels[genre] || genre} picks — all skill-based, zero brainrot:`,
      games,
    };
  }

  function _recommendBeginner() {
    const games = RP.GAMES.filter(g => g.beginner).sort((a, b) => b.rating - a.rating).slice(0, 4);
    return {
      text: "These are perfect for beginners — easy to pick up, actually fun, and no prior knowledge needed:",
      games,
    };
  }

  function _recommendHard() {
    const games = RP.GAMES.filter(g => ['hard', 'extreme'].includes(g.diff)).sort((a, b) => b.rating - a.rating).slice(0, 4);
    return {
      text: "Want a real challenge? These games will genuinely test your skills:",
      games,
    };
  }

  function _recommendSolo() {
    const games = RP.GAMES.filter(g => !g.mp).sort((a, b) => b.rating - a.rating).slice(0, 4);
    return {
      text: "Great solo games — enjoyable alone without needing a team:",
      games,
    };
  }

  function _recommendMP() {
    const games = RP.GAMES.filter(g => g.mp).sort((a, b) => b.rating - a.rating).slice(0, 4);
    return {
      text: "Best multiplayer games to enjoy with friends:",
      games,
    };
  }

  function _recommendGems() {
    const games = RP.GAMES.filter(g => g.gem).sort((a, b) => b.rating - a.rating);
    return {
      text: "These hidden gems are criminally underplayed — seriously, try them:",
      games,
    };
  }

  function _explainBrainrot() {
    return {
      text: "\"Brainrot\" games are designed to waste your time rather than give you a real experience. They usually involve:\n\n🤖 Auto-clicker simulators (tap to collect)\n💸 Pay-to-win mechanics\n🎰 Gambling/egg hatching\n🔁 Copy-paste obbies\n\nEverything on RobloxPicks is the opposite — real gameplay, real challenge, real fun.",
    };
  }

  function _describeGame(input) {
    const lower = input.toLowerCase();
    const game = RP.GAMES.find(g =>
      lower.includes(g.title.toLowerCase()) ||
      lower.includes(g.id.replace(/-/g, ' '))
    );
    if (game) {
      _context.lastGame = game;
      return {
        text: `**${game.title}** by ${game.creator}\n\n${game.fullDesc || game.desc}\n\n👍 Rated ${game.rating}% · ${game.playersLabel} · Difficulty: ${game.diff}`,
        games: [game],
      };
    }
    return {
      text: "I don't have info on that specific game. Try asking about one of our 80+ curated games! You can also search using the bar at the top.",
    };
  }

  function _findSimilar(input) {
    const lower = input.toLowerCase();
    const ref = RP.GAMES.find(g => lower.includes(g.title.toLowerCase()));
    if (ref) {
      const similar = RP.GAMES
        .filter(g => g.genre === ref.genre && g.id !== ref.id)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4);
      return {
        text: `If you like **${ref.title}**, you'll probably enjoy these:`,
        games: similar,
      };
    }
    // Fall back to last genre if no game found
    if (_context.lastGenre) {
      return _recommendGenre(_context.lastGenre);
    }
    return {
      text: "Tell me which game you like and I'll find similar ones! For example: \"games similar to Doors\" or \"something like Jailbreak\".",
    };
  }

  function _recommendAnime() {
    const games = RP.GAMES.filter(g => g.tags.some(t => t.toLowerCase().includes('anime'))).sort((a, b) => b.rating - a.rating);
    return {
      text: "If you're into anime, these Roblox games are the real deal:",
      games: games.slice(0, 4),
    };
  }

  function _recommendClassics() {
    const games = RP.GAMES.filter(g => g.badge === 'classic').sort((a, b) => b.rating - a.rating);
    return {
      text: "OG Roblox hits that still hold up — timeless classics:",
      games: games.slice(0, 4),
    };
  }

  function _recommendNew() {
    const games = RP.GAMES.filter(g => g.year >= 2022).sort((a, b) => b.rating - a.rating);
    return {
      text: "Best newer games (2022–2024) — fresh and quality:",
      games: games.slice(0, 4),
    };
  }

  function _showHelp() {
    return {
      text: "I can help you find games! Try asking:\n\n🎮 \"Best FPS games\"\n👻 \"Scary horror games\"\n🌱 \"Easy games for beginners\"\n💎 \"Hidden gems\"\n🔥 \"Hardest games\"\n🎵 \"Games similar to Funky Friday\"\n📖 \"Tell me about Deepwoken\"\n🚫 \"What is brainrot?\"\n\nJust ask naturally — I'll figure it out!",
    };
  }

  function _thanks() {
    const replies = [
      "You're welcome! Enjoy the game 🎮",
      "Happy to help! Let me know if you want more recommendations.",
      "Glad I could help! Good luck and have fun 🎉",
      "Anytime! That's what I'm here for.",
    ];
    return { text: replies[Math.floor(Math.random() * replies.length)] };
  }

  function _fallback(input) {
    const fallbacks = [
      `I'm not sure about "${input}" — try asking about a genre like "horror", "FPS", or "adventure". Or ask "what should I play?"`,
      "Hmm, I didn't quite get that. Try: \"best horror games\", \"games for beginners\", or \"tell me about Doors\".",
      "I didn't understand that one. Ask me about a genre, difficulty, or specific game and I'll find something great for you!",
    ];
    return { text: fallbacks[Math.floor(Math.random() * fallbacks.length)] };
  }

  /* ── Process message ── */
  function processMessage(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    _context.messageCount++;

    for (const intent of INTENTS) {
      if (intent.patterns.some(p => p.test(trimmed))) {
        return intent.respond(trimmed);
      }
    }

    return _fallback(trimmed);
  }

  /* ── Render message ── */
  function _addMessage(role, response) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const avatar = `<div class="msg-avatar">${role === 'ai' ? '🤖' : '👤'}</div>`;
    let text = typeof response === 'string' ? response : response.text;
    // Convert **bold** and newlines
    text = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let chipsHtml = '';
    if (response.games?.length) {
      chipsHtml = `<div class="msg-game-chips">
        ${response.games.map(g => `
          <button class="msg-game-chip" data-id="${g.id}">
            ${g.emoji} ${g.title}
          </button>`).join('')}
      </div>`;
    }

    div.innerHTML = `
      ${avatar}
      <div class="msg-bubble">${text}${chipsHtml}</div>`;

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;

    /* Chip clicks → open modal */
    div.querySelectorAll('.msg-game-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const game = RP.GAMES.find(g => g.id === chip.dataset.id);
        if (game) { RP.Modal.open(game); RP.History.push(game.id); }
      });
    });
  }

  function _addTyping() {
    const msgs = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = 'chatTyping';
    div.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="chat-typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>`;
    msgs?.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _removeTyping() {
    document.getElementById('chatTyping')?.remove();
  }

  function send(input) {
    const trimmed = input?.trim();
    if (!trimmed) return;

    _addMessage('user', trimmed);

    // Simulate typing delay
    _addTyping();
    setTimeout(() => {
      _removeTyping();
      const response = processMessage(trimmed);
      if (response) _addMessage('ai', response);
    }, 600 + Math.random() * 400);
  }

  /* ── Quick suggestions ── */
  const SUGGESTIONS = [
    'Best games to play 🎮',
    'Scary horror games 👻',
    'Easy beginner games 🌱',
    'Hidden gems 💎',
    'Best FPS games 🔫',
    'Games like Doors 🚪',
    'Anime games ⚔️',
    'What is brainrot? 🧠',
  ];

  function _renderSuggestions() {
    const el = document.getElementById('chatSuggestions');
    if (!el) return;
    el.innerHTML = SUGGESTIONS.map(s => `
      <button class="chat-suggestion-btn">${s}</button>`).join('');
    el.querySelectorAll('.chat-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        if (input) {
          input.value = btn.textContent.replace(/[^\w\s?']/g,'').trim();
          _handleSend();
        }
      });
    });
  }

  function _handleSend() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    send(val);
    /* Hide suggestions after first real message */
    const sugg = document.getElementById('chatSuggestions');
    if (sugg && _context.messageCount > 0) sugg.style.display = 'none';
  }

  function toggle() {
    const panel = document.getElementById('chatPanel');
    if (!panel) return;
    _open = !_open;
    panel.hidden = !_open;
    if (_open) {
      const msgs = document.getElementById('chatMessages');
      if (msgs && msgs.children.length === 0) {
        _addMessage('ai', {
          text: "Hey! 👋 I'm your RobloxPicks AI Advisor. I know every game on this site.\n\nAsk me about genres, difficulty, hidden gems — or just say what you're in the mood for!",
        });
        _renderSuggestions();
      }
      document.getElementById('chatInput')?.focus();
    }
  }

  function init() {
    document.getElementById('chatToggle')?.addEventListener('click', toggle);
    document.getElementById('heroAiBtn')?.addEventListener('click', toggle);
    document.getElementById('chatClose')?.addEventListener('click', toggle);

    document.getElementById('chatSend')?.addEventListener('click', _handleSend);
    document.getElementById('chatInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _handleSend(); }
    });
  }

  return { init, toggle, send };
})();
