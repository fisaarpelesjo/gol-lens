// app.js
(function () {
  var BASE_URL = 'https://apiv3.apifootball.com/';
  var LS_KEY = 'apifootball_api_key_v1';

  var els = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    useKeyBtn: document.getElementById('useKeyBtn'),
    clearKeyBtn: document.getElementById('clearKeyBtn'),
    toggleKeyBtn: document.getElementById('toggleKeyBtn'),
    keyHint: document.getElementById('keyHint'),

    loadBtn: document.getElementById('loadBtn'),
    countrySelect: document.getElementById('countrySelect'),
    leagueSelect: document.getElementById('leagueSelect'),
    teamSelect: document.getElementById('teamSelect'),
    playerSelect: document.getElementById('playerSelect'),
    nextGamesInput: document.getElementById('nextGamesInput'),
    shotQualityInput: document.getElementById('shotQualityInput'),
    finishingCapInput: document.getElementById('finishingCapInput'),
    modeSelect: document.getElementById('modeSelect'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    status: document.getElementById('status'),

    dot: document.getElementById('dot'),
    headerTitle: document.getElementById('headerTitle'),
    headerMeta: document.getElementById('headerMeta'),
    kpiXg: document.getElementById('kpiXg'),
    kpiXgS: document.getElementById('kpiXgS'),
    kpiFin: document.getElementById('kpiFin'),
    kpiFinS: document.getElementById('kpiFinS'),
    kpiPred: document.getElementById('kpiPred'),
    kpiPredS: document.getElementById('kpiPredS'),
    playerTable: document.getElementById('playerTable'),
    derivedTable: document.getElementById('derivedTable'),
    formulaNote: document.getElementById('formulaNote'),
  };

  var state = {
    leagues: [],
    leaguesByCountry: new Map(),
    teams: [],
    players: [],
    selected: {
      country: '',
      league_id: '',
      league_name: '',
      league_season: '',
      team_id: '',
      team_name: '',
      player_id: '',
      player_name: '',
    },
    apiKey: '',
  };

  function setStatus(msg) {
    els.status.textContent = msg || '';
  }

  function setDot(level) {
    var cls = 'h-2.5 w-2.5 rounded-full ';
    if (level === 'ok') cls += 'bg-emerald-400';
    else if (level === 'warn') cls += 'bg-amber-400';
    else if (level === 'bad') cls += 'bg-rose-400';
    else cls += 'bg-slate-500';
    els.dot.className = cls;
  }

  function maskKey(key) {
    var k = String(key || '');
    if (!k) return '';
    if (k.length <= 8) return '••••••••';
    return k.slice(0, 4) + '••••••••' + k.slice(-4);
  }

  function updateKeyHint() {
    var saved = getSavedKey();
    if (saved) els.keyHint.textContent = 'Saved key: ' + maskKey(saved);
    else els.keyHint.textContent = 'No key saved.';
  }

  function getSavedKey() {
    try {
      return String(localStorage.getItem(LS_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function saveKey(key) {
    try {
      localStorage.setItem(LS_KEY, String(key || '').trim());
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSavedKey() {
    try {
      localStorage.removeItem(LS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function setSelectOptions(selectEl, items, placeholder) {
    selectEl.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder || 'Select...';
    selectEl.appendChild(ph);

    for (var i = 0; i < items.length; i += 1) {
      var opt = document.createElement('option');
      opt.value = String(items[i].value);
      opt.textContent = String(items[i].label);
      selectEl.appendChild(opt);
    }
  }

  function parseNum(v) {
    if (v === null || v === undefined) return 0;
    var s = String(v).trim();
    if (!s) return 0;
    var n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(n, a, b) {
    if (n < a) return a;
    if (n > b) return b;
    return n;
  }

  function fmt(n, digits) {
    if (n === null || n === undefined) return '—';
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(digits == null ? 2 : digits);
  }

  function safeText(v) {
    var s = v == null ? '' : String(v);
    return s.trim() ? s : '—';
  }

  function trRow(k, v) {
    return '<tr class="border-b border-slate-800">' + '<td class="px-3 py-2 text-xs text-slate-400">' + k + '</td>' + '<td class="px-3 py-2 text-sm">' + v + '</td>' + '</tr>';
  }

  function api(params) {
    var key = String(state.apiKey || '').trim();
    if (!key) throw new Error('Set your API key first (Use key now / Save key).');
    var url = new URL(BASE_URL);
    Object.keys(params).forEach(function (k) {
      url.searchParams.set(k, String(params[k]));
    });
    url.searchParams.set('APIkey', key);
    return fetch(url.toString(), { method: 'GET' }).then(function (r) {
      if (!r.ok)
        return r.text().then(function (t) {
          throw new Error('HTTP ' + r.status + ' — ' + t);
        });
      return r.json();
    });
  }

  function resetAll() {
    setSelectOptions(els.countrySelect, [], 'Select a country');
    setSelectOptions(els.leagueSelect, [], 'Select a league');
    setSelectOptions(els.teamSelect, [], 'Select a team');
    setSelectOptions(els.playerSelect, [], 'Select a player');
    els.countrySelect.disabled = true;
    els.leagueSelect.disabled = true;
    els.teamSelect.disabled = true;
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;
    renderEmpty();
  }

  function loadLeagues() {
    setStatus('Loading leagues...');
    setDot('warn');
    els.leagueSelect.disabled = true;
    els.teamSelect.disabled = true;
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;

    return api({ action: 'get_leagues' })
      .then(function (data) {
        var leagues = Array.isArray(data) ? data : [];
        state.leagues = leagues;

        var byCountry = new Map();
        for (var i = 0; i < leagues.length; i += 1) {
          var c = safeText(leagues[i].country_name);
          if (c === '—') continue;
          if (!byCountry.has(c)) byCountry.set(c, []);
          byCountry.get(c).push(leagues[i]);
        }

        state.leaguesByCountry = byCountry;

        var countries = Array.from(byCountry.keys()).sort(function (a, b) {
          return a.localeCompare(b);
        });

        setSelectOptions(
          els.countrySelect,
          countries.map(function (c) {
            return { value: c, label: c };
          }),
          'Select a country'
        );

        els.countrySelect.disabled = false;
        els.leagueSelect.disabled = false;

        setSelectOptions(els.leagueSelect, [], 'Select a league');
        setSelectOptions(els.teamSelect, [], 'Select a team');
        setSelectOptions(els.playerSelect, [], 'Select a player');

        if (countries.length) {
          els.countrySelect.value = String(countries[0]);
          handleCountryChange();
        }

        setStatus(countries.length ? 'Ready.' : 'No countries found from leagues.');
        setDot(countries.length ? 'ok' : 'warn');
      })
      .catch(function (e) {
        setDot('bad');
        setStatus('Failed to load leagues:\n' + e.message);
      });
  }

  function loadTeams(leagueId) {
    setStatus('Loading teams...');
    setDot('warn');
    els.teamSelect.disabled = true;
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;

    return api({ action: 'get_teams', league_id: leagueId })
      .then(function (data) {
        var teams = Array.isArray(data) ? data : [];
        state.teams = teams;

        var opts = teams
          .map(function (t) {
            return { value: t.team_key, label: t.team_name };
          })
          .sort(function (a, b) {
            return String(a.label || '').localeCompare(String(b.label || ''));
          });

        setSelectOptions(els.teamSelect, opts, 'Select a team');
        els.teamSelect.disabled = false;

        setSelectOptions(els.playerSelect, [], 'Select a player');
        els.playerSelect.disabled = true;

        setStatus(opts.length ? 'Teams loaded.' : 'No teams returned for this league.');
        setDot(opts.length ? 'ok' : 'warn');
      })
      .catch(function (e) {
        setDot('bad');
        setStatus('Failed to load teams:\n' + e.message);
      });
  }

  function loadPlayers(teamId) {
    setStatus('Loading squad (players)...');
    setDot('warn');
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;

    return api({ action: 'get_teams', team_id: teamId, league_id: state.selected.league_id })
      .then(function (data) {
        var teams = Array.isArray(data) ? data : [];
        if (!teams.length) {
          state.players = [];
          setSelectOptions(els.playerSelect, [], 'Select a player');
          setStatus('No team data returned.');
          setDot('warn');
          return;
        }

        var t0 = teams[0];
        var players = Array.isArray(t0.players) ? t0.players : [];
        state.players = players;

        var opts = players
          .map(function (p) {
            return { value: p.player_id || p.player_key, label: p.player_name || 'Unnamed' };
          })
          .filter(function (o) {
            return String(o.value || '').trim() !== '';
          })
          .sort(function (a, b) {
            return String(a.label || '').localeCompare(String(b.label || ''));
          });

        setSelectOptions(els.playerSelect, opts, 'Select a player');
        els.playerSelect.disabled = false;

        setStatus(opts.length ? 'Players loaded ‘.' : 'No players returned for this team.');
        setDot(opts.length ? 'ok' : 'warn');
      })
      .catch(function (e) {
        setDot('bad');
        setStatus('Failed to load players:\n' + e.message);
      });
  }

  function handleCountryChange() {
    var country = String(els.countrySelect.value || '').trim();
    state.selected.country = country;

    var leagues = state.leaguesByCountry.get(country) || [];

    var opts = leagues
      .map(function (l) {
        var label = String(l.league_name || '').trim();
        var season = String(l.league_season || '').trim();
        if (season) label += ' (' + season + ')';
        return { value: l.league_id, label: label };
      })
      .sort(function (a, b) {
        return String(a.label || '').localeCompare(String(b.label || ''));
      });

    setSelectOptions(els.leagueSelect, opts, 'Select a league');
    els.leagueSelect.disabled = false;

    setSelectOptions(els.teamSelect, [], 'Select a team');
    els.teamSelect.disabled = true;

    setSelectOptions(els.playerSelect, [], 'Select a player');
    els.playerSelect.disabled = true;

    els.analyzeBtn.disabled = true;

    state.selected.league_id = '';
    state.selected.league_name = '';
    state.selected.league_season = '';
    state.selected.team_id = '';
    state.selected.team_name = '';
    state.selected.player_id = '';
    state.selected.player_name = '';

    renderEmpty();

    if (opts.length) {
      els.leagueSelect.value = String(opts[0].value);
      handleLeagueChange();
    } else {
      setDot('warn');
      setStatus('No leagues found for this country.');
    }
  }

  function handleLeagueChange() {
    var leagueId = String(els.leagueSelect.value || '').trim();
    state.selected.league_id = leagueId;

    var country = state.selected.country;
    var leagues = state.leaguesByCountry.get(country) || [];
    var found = null;

    for (var i = 0; i < leagues.length; i += 1) {
      if (String(leagues[i].league_id) === leagueId) {
        found = leagues[i];
        break;
      }
    }

    state.selected.league_name = found && found.league_name ? String(found.league_name) : '';
    state.selected.league_season = found && found.league_season ? String(found.league_season) : '';

    state.selected.team_id = '';
    state.selected.team_name = '';
    state.selected.player_id = '';
    state.selected.player_name = '';

    setSelectOptions(els.teamSelect, [], 'Select a team');
    els.teamSelect.disabled = true;
    setSelectOptions(els.playerSelect, [], 'Select a player');
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;

    renderEmpty();

    if (!leagueId) return;

    loadTeams(leagueId).then(function () {
      els.teamSelect.value = '';
      els.analyzeBtn.disabled = true;
    });
  }

  function handleTeamChange() {
    var teamId = String(els.teamSelect.value || '').trim();
    state.selected.team_id = teamId;

    var found = null;
    for (var i = 0; i < state.teams.length; i += 1) {
      if (String(state.teams[i].team_key) === teamId) {
        found = state.teams[i];
        break;
      }
    }
    state.selected.team_name = found && found.team_name ? String(found.team_name) : '';

    state.selected.player_id = '';
    state.selected.player_name = '';

    setSelectOptions(els.playerSelect, [], 'Select a player');
    els.playerSelect.disabled = true;
    els.analyzeBtn.disabled = true;

    renderEmpty();

    if (!teamId) return;

    loadPlayers(teamId).then(function () {
      els.playerSelect.value = '';
      els.analyzeBtn.disabled = true;
      renderEmpty();
    });
  }

  function handlePlayerChange() {
    var playerId = String(els.playerSelect.value || '').trim();
    state.selected.player_id = playerId;

    var found = null;
    for (var i = 0; i < state.players.length; i += 1) {
      var pid = state.players[i].player_id || state.players[i].player_key;
      if (String(pid) === playerId) {
        found = state.players[i];
        break;
      }
    }

    if (!found) {
      state.selected.player_name = '';
      els.analyzeBtn.disabled = true;
      renderEmpty();
      return;
    }

    state.selected.player_name = safeText(found.player_name);
    els.analyzeBtn.disabled = false;

    renderBase(found);
    setDot('ok');
    setStatus('Ready to calculate.');
  }

  function renderEmpty() {
    els.headerTitle.textContent = 'Select a player';
    els.headerMeta.textContent = '';
    els.kpiXg.textContent = '—';
    els.kpiFin.textContent = '—';
    els.kpiPred.textContent = '—';
    els.kpiXgS.textContent = '—';
    els.kpiFinS.textContent = '—';
    els.kpiPredS.textContent = '—';
    els.playerTable.innerHTML = '';
    els.derivedTable.innerHTML = '';
    els.formulaNote.textContent = '';
    setDot('warn');
  }

  function renderBase(p) {
    var metaParts = [];
    if (state.selected.country) metaParts.push(state.selected.country);
    if (state.selected.league_name) metaParts.push(state.selected.league_name);
    if (state.selected.league_season) metaParts.push(state.selected.league_season);
    if (state.selected.team_name) metaParts.push(state.selected.team_name);

    els.headerTitle.textContent = state.selected.player_name !== '—' ? state.selected.player_name : 'Player';
    els.headerMeta.textContent = metaParts.join(' • ');

    var rows = '';
    rows += trRow('Position', safeText(p.player_type));
    rows += trRow('Age', safeText(p.player_age));
    rows += trRow('Number', safeText(p.player_number));
    rows += trRow('Matches', safeText(p.player_match_played));
    rows += trRow('Goals', safeText(p.player_goals));
    rows += trRow('Assists', safeText(p.player_assists));
    rows += trRow('Yellow cards', safeText(p.player_yellow_cards));
    rows += trRow('Red cards', safeText(p.player_red_cards));
    rows += trRow('Shots (total)', safeText(p.player_shots_total));
    rows += trRow('Rating', safeText(p.player_rating));
    els.playerTable.innerHTML = rows;

    els.derivedTable.innerHTML = '';
    els.formulaNote.textContent = '';
  }

  function computeXgApprox(goals, shots, quality) {
    var q = clamp(quality, 0.05, 0.3);
    var s = Math.max(0, shots);
    if (s > 0) return s * q;
    var g = Math.max(0, goals);
    return g * 0.35;
  }

  function computeFinishingIndex(goals, xg, cap) {
    var c = clamp(cap, 0.5, 3);
    if (!(xg > 0)) return 1;
    var raw = goals / xg;
    return clamp(raw, 0.5, c);
  }

  function poissonProbAtLeastOne(lambda) {
    if (!(lambda >= 0)) return 0;
    return 1 - Math.exp(-lambda);
  }

  function doAnalysis() {
    var p = null;
    for (var i = 0; i < state.players.length; i += 1) {
      var pid = state.players[i].player_id || state.players[i].player_key;
      if (String(pid) === String(state.selected.player_id)) {
        p = state.players[i];
        break;
      }
    }
    if (!p) return;

    var matches = parseNum(p.player_match_played);
    var goals = parseNum(p.player_goals);
    var shots = parseNum(p.player_shots_total);

    var nextGames = clamp(parseNum(els.nextGamesInput.value), 1, 80);

    var shotQuality = Number(els.shotQualityInput.value);
    if (!Number.isFinite(shotQuality)) shotQuality = 0.12;

    var finishingCap = Number(els.finishingCapInput.value);
    if (!Number.isFinite(finishingCap)) finishingCap = 1.5;

    var xgSeason = computeXgApprox(goals, shots, shotQuality);
    var fin = computeFinishingIndex(goals, xgSeason, finishingCap);

    var xgPerGame = matches > 0 ? xgSeason / matches : 0;

    var mode = String(els.modeSelect.value || 'xg');
    var lambdaGoalsNext = xgPerGame * nextGames;

    if (mode === 'xg_finishing') {
      lambdaGoalsNext = xgPerGame * fin * nextGames;
    }

    var pAtLeastOneGoal = poissonProbAtLeastOne(lambdaGoalsNext);

    els.kpiXg.textContent = fmt(xgSeason, 2);
    els.kpiXgS.textContent = matches > 0 ? fmt(xgPerGame, 3) + ' xG/game' : 'Fallback used';

    els.kpiFin.textContent = fmt(fin, 2);
    els.kpiFinS.textContent = 'cap: ' + fmt(clamp(finishingCap, 0.5, 3), 1);

    els.kpiPred.textContent = fmt(lambdaGoalsNext, 2);
    els.kpiPredS.textContent = 'P(≥1 goal): ' + fmt(pAtLeastOneGoal * 100, 1) + '%';

    var drows = '';
    drows += trRow('xG (approx.)', fmt(xgSeason, 2));
    drows += trRow('xG per game', fmt(xgPerGame, 3));
    drows += trRow('Finishing (g/xG)', fmt(fin, 2));
    drows += trRow('λ goals (next games)', fmt(lambdaGoalsNext, 2));
    drows += trRow('P(≥1 goal)', fmt(pAtLeastOneGoal * 100, 1) + '%');
    els.derivedTable.innerHTML = drows;

    els.formulaNote.textContent = 'xG≈(shots×q) or fallback (goals×0.35)\n' + 'fin=clamp(goals/xG, 0.5, cap)\n' + 'λ=(xG/game)×games' + (mode === 'xg_finishing' ? '×fin' : '') + '\nP(≥1)=1−e^(−λ)';

    setDot(lambdaGoalsNext >= 1 ? 'ok' : lambdaGoalsNext >= 0.5 ? 'warn' : 'bad');
    setStatus('Analysis completed.');
  }

  function setApiKeyFromInput() {
    var key = String(els.apiKeyInput.value || '').trim();
    state.apiKey = key;
  }

  function applySavedKeyToInputAndState() {
    var saved = getSavedKey();
    if (saved) {
      els.apiKeyInput.value = saved;
      state.apiKey = saved;
      return true;
    }
    return false;
  }

  function handleSaveKey() {
    var key = String(els.apiKeyInput.value || '').trim();
    if (!key) {
      setDot('bad');
      setStatus('Paste an API key before saving.');
      return;
    }
    var ok = saveKey(key);
    if (!ok) {
      setDot('bad');
      setStatus('Failed to save in localStorage.');
      return;
    }
    state.apiKey = key;
    updateKeyHint();
    setDot('ok');
    setStatus('Key saved and applied.');
  }

  function handleUseKeyNow() {
    var key = String(els.apiKeyInput.value || '').trim();
    if (!key) {
      setDot('bad');
      setStatus('Paste an API key to use it.');
      return;
    }
    state.apiKey = key;
    updateKeyHint();
    setDot('ok');
    setStatus('Key applied (not saved).');
  }

  function handleClearSavedKey() {
    var ok = clearSavedKey();
    updateKeyHint();
    if (!ok) {
      setDot('bad');
      setStatus('Failed to clear localStorage.');
      return;
    }
    setDot('ok');
    setStatus('Saved key removed.');
  }

  function handleToggleKey() {
    var isPassword = els.apiKeyInput.getAttribute('type') === 'password';
    els.apiKeyInput.setAttribute('type', isPassword ? 'text' : 'password');
    els.toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
  }

  function handleLoad() {
    setApiKeyFromInput();
    if (!String(state.apiKey || '').trim()) {
      if (!applySavedKeyToInputAndState()) {
        resetAll();
        setDot('bad');
        setStatus('Set your API key (Use key now / Save key).');
        return;
      }
    }

    resetAll();

    els.loadBtn.disabled = true;
    els.loadBtn.textContent = 'Loading...';
    loadLeagues().finally(function () {
      els.loadBtn.disabled = false;
      els.loadBtn.textContent = 'Load data';
    });
  }

  function wire() {
    els.saveKeyBtn.addEventListener('click', handleSaveKey);
    els.useKeyBtn.addEventListener('click', handleUseKeyNow);
    els.clearKeyBtn.addEventListener('click', handleClearSavedKey);
    els.toggleKeyBtn.addEventListener('click', handleToggleKey);

    els.loadBtn.addEventListener('click', handleLoad);
    els.countrySelect.addEventListener('change', handleCountryChange);
    els.leagueSelect.addEventListener('change', handleLeagueChange);
    els.teamSelect.addEventListener('change', handleTeamChange);
    els.playerSelect.addEventListener('change', handlePlayerChange);
    els.analyzeBtn.addEventListener('click', doAnalysis);
  }

  function init() {
    resetAll();
    wire();
    applySavedKeyToInputAndState();
    updateKeyHint();
    setStatus('Set your API key and click “Load data”.');
    setDot('warn');
  }

  init();
})();
