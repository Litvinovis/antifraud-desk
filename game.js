/**
 * ANTIFRAUD DESK: СИГНАЛ
 * Главный игровой модуль
 *
 * Архитектура:
 *  - state   : единственный источник истины для всего состояния
 *  - Audio   : Web Audio API (без внешних файлов)
 *  - UI      : чистые функции рендеринга + класс-манипуляции
 */

'use strict';

/* =====================================================
   WEB AUDIO API — синтез звуков без файлов
   ===================================================== */
let audioCtx = null;

/** Инициализируем AudioContext после первого пользовательского клика */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

/**
 * playSound(type)
 * Типы: 'click', 'signal', 'wrong', 'correct', 'gameover', 'countdown', 'sabotage', 'false'
 */
function playSound(type) {
  if (!audioCtx) return;

  const ctx = audioCtx;
  const now = ctx.currentTime;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now); osc.stop(now + 0.12);
      break;

    case 'signal':
      // Короткий восходящий тон — «тревожный сигнал»
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
      break;

    case 'false':
      // Ложный сигнал — низкий шуршащий
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
      break;

    case 'wrong':
      // Нисходящий двойной гудок
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
      break;

    case 'correct':
      // Восходящий аккорд
      [523, 659, 784].forEach((freq, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine';
        o2.frequency.setValueAtTime(freq, now + i * 0.08);
        g2.gain.setValueAtTime(0.12, now + i * 0.08);
        g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        o2.start(now + i * 0.08);
        o2.stop(now + i * 0.08 + 0.4);
      });
      return; // oscillator уже запущен в цикле

    case 'gameover':
      // Нисходящий хроматический глиссандо
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.start(now); osc.stop(now + 1.3);
      break;

    case 'countdown':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
      break;

    case 'sabotage':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now); osc.stop(now + 0.55);
      break;
  }

}

/* =====================================================
   КОНФИГИ СЛОЖНОСТИ
   ===================================================== */
const DIFFICULTY = {
  easy: {
    label:       '🟢 ЛЁГКИЙ',
    signalDelay: 1100,   // мс — истинный сигнал горит
    falseDelay:  650,    // мс — ложный сигнал горит
    pauseDelay:  380,    // мс — пауза между сигналами
    timerBase:   10,     // сек базового таймера ввода (+ номер раунда)
    lsKey:       'antifraud_lb_easy',
  },
  medium: {
    label:       '🟡 СРЕДНИЙ',
    signalDelay: 700,
    falseDelay:  400,
    pauseDelay:  250,
    timerBase:   7,
    lsKey:       'antifraud_lb_medium',
  },
  hard: {
    label:       '🔴 СЛОЖНЫЙ',
    signalDelay: 360,
    falseDelay:  200,
    pauseDelay:  120,
    timerBase:   5,
    lsKey:       'antifraud_lb_hard',
  },
};

/* =====================================================
   ДАННЫЕ ОБ УСТРОЙСТВАХ
   ===================================================== */
const DEVICES = [
  { id: 0, name: 'Красный монитор', emoji: '🖥️', sound: 'signal' },
  { id: 1, name: 'Синий монитор',   emoji: '💻', sound: 'signal' },
  { id: 2, name: 'Зелёный монитор', emoji: '📟', sound: 'signal' },
  { id: 3, name: 'Факс',            emoji: '📠', sound: 'signal' },
  { id: 4, name: 'Принтер',         emoji: '🖨️', sound: 'signal' },
  { id: 5, name: 'Стационарный телефон', emoji: '📞', sound: 'signal' },
  { id: 6, name: 'Мобильный телефон',    emoji: '📱', sound: 'signal' },
  { id: 7, name: 'Ноутбук',         emoji: '💼', sound: 'signal' },
  { id: 8, name: 'Планшет',         emoji: '📲', sound: 'signal' },
];

/* =====================================================
   СОСТОЯНИЕ ИГРЫ
   ===================================================== */
const state = {
  mode:        'solo',     // 'solo' | 'duel'
  difficulty:  'medium',   // 'easy' | 'medium' | 'hard'
  players:     [],         // [{ name, balance, maxRound }]
  currentPlayer: 0,        // индекс текущего игрока (для дуэли)
  round:       1,
  phase:       'idle',     // 'demo' | 'input' | 'result' | 'gameover'
  trueSequence:   [],      // истинная последовательность (id устройств)
  fullSequence:   [],      // истинная + ложные вперемешку
  playerInput:    [],      // то, что введёл игрок
  stressLevel:    0,       // 0..100
  timerInterval:  null,
  timerRemaining: 0,
  sabotageUsed:   false,   // для дуэли: кнопка «Подстава»
  duelSabotage:   false,   // флаг активной «Подставы»
  duelResult:     [],      // результаты раундов дуэли [{ player, passed }]
};

/* =====================================================
   ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ
   ===================================================== */
const $ = id => document.getElementById(id);

const screens = {
  start:    $('screen-start'),
  game:     $('screen-game'),
  result:   $('screen-result'),
  gameover: $('screen-gameover'),
};

/* =====================================================
   НАВИГАЦИЯ ПО ЭКРАНАМ
   ===================================================== */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

/* =====================================================
   СТАРТОВЫЙ ЭКРАН
   ===================================================== */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;

    if (state.mode === 'solo') {
      $('solo-inputs').classList.remove('hidden');
      $('duel-inputs').classList.add('hidden');
    } else {
      $('solo-inputs').classList.add('hidden');
      $('duel-inputs').classList.remove('hidden');
    }
  });
});

/* =====================================================
   ВЫБОР СЛОЖНОСТИ
   ===================================================== */
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
  });
});

/* =====================================================
   КНОПКА ТАБЛИЦЫ ЛИДЕРОВ (стартовый экран)
   ===================================================== */
$('btn-show-leaderboard').addEventListener('click', () => {
  initAudio();
  playSound('click');
  openLeaderboardModal('medium');
});

document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    openLeaderboardModal(tab.dataset.tab);
  });
});

$('lb-modal-close').addEventListener('click', () => {
  $('leaderboard-modal').classList.add('hidden');
});

$('leaderboard-modal').addEventListener('click', (e) => {
  if (e.target === $('leaderboard-modal')) {
    $('leaderboard-modal').classList.add('hidden');
  }
});

function openLeaderboardModal(diff) {
  // Активируем нужный таб
  document.querySelectorAll('.lb-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === diff);
  });

  const board = getLeaderboardByDiff(diff);
  const tbody = $('lb-modal-body');
  tbody.innerHTML = '';

  if (board.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim);text-align:center">Рекордов пока нет</td></tr>';
  } else {
    board.forEach((entry, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td>${entry.maxRound}</td>
        <td>${entry.date}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  $('leaderboard-modal').classList.remove('hidden');
}

$('btn-start').addEventListener('click', () => {
  initAudio();
  playSound('click');

  if (state.mode === 'solo') {
    const name = $('player1-name').value.trim() || 'Оперативник';
    state.players = [{ name, balance: 1_000_000, maxRound: 0 }];
  } else {
    const n1 = $('player1-duel-name').value.trim() || 'Оперативник 1';
    const n2 = $('player2-duel-name').value.trim() || 'Оперативник 2';
    state.players = [
      { name: n1, balance: 1_000_000, maxRound: 0, alive: true },
      { name: n2, balance: 1_000_000, maxRound: 0, alive: true },
    ];
  }

  state.round = 1;
  state.currentPlayer = 0;
  state.sabotageUsed  = false;
  state.duelSabotage  = false;
  state.duelResult    = [];

  showScreen('game');
  startRound();
});

/* =====================================================
   ГЕНЕРАЦИЯ ПОСЛЕДОВАТЕЛЬНОСТЕЙ
   ===================================================== */

/**
 * Генерирует истинную последовательность без повторов подряд.
 * @param {number} length
 */
function generateTrueSequence(length) {
  const seq = [];
  let last = -1;
  while (seq.length < length) {
    let id;
    do { id = Math.floor(Math.random() * DEVICES.length); } while (id === last);
    seq.push(id);
    last = id;
  }
  return seq;
}

/**
 * Вставляет N ложных сигналов в случайные позиции между истинными.
 * Ложный сигнал не совпадает с соседним истинным.
 * @param {number[]} trueSeq
 * @param {number}   falseCount
 */
function buildFullSequence(trueSeq, falseCount) {
  const full = [...trueSeq.map(id => ({ id, real: true }))];
  for (let i = 0; i < falseCount; i++) {
    const pos = Math.floor(Math.random() * (full.length + 1));
    // Подбираем прибор, не совпадающий с соседями
    const neighbors = new Set([
      full[pos - 1]?.id,
      full[pos]?.id,
    ]);
    let fid;
    do { fid = Math.floor(Math.random() * DEVICES.length); } while (neighbors.has(fid));
    full.splice(pos, 0, { id: fid, real: false });
  }
  return full;
}

/* =====================================================
   ЗАПУСК РАУНДА
   ===================================================== */
function startRound() {
  clearTimer();
  state.phase        = 'demo';
  state.playerInput  = [];
  state.stressLevel  = 0;

  updateHUD();
  renderInputSequence();
  updateStress();

  // Длина истинной последовательности = 2 + раунд
  const seqLen = 2 + state.round;
  // Ложных сигналов: round//2 (минимум 1 на раунде >= 2)
  let falseCount = Math.floor(state.round / 2);
  if (state.duelSabotage) { falseCount += 2; state.duelSabotage = false; }

  state.trueSequence = generateTrueSequence(seqLen);
  state.fullSequence = buildFullSequence(state.trueSequence, falseCount);

  // Кнопки управления
  $('btn-reset').classList.add('hidden');
  $('btn-sabotage').classList.add('hidden');

  setDevicesClickable(false);

  // Дуэльный баннер
  updateDuelBanner();

  // Фаза демонстрации: показываем последовательность дважды
  showPhaseOverlay('👁 СМОТРИ');
  setTimeout(() => {
    hidePhaseOverlay();
    runDemoPhase(0, () => {
      // Вторая демонстрация
      setTimeout(() => {
        showPhaseOverlay('🔄 ЕЩЁ РАЗ');
        setTimeout(() => {
          hidePhaseOverlay();
          runDemoPhase(0, startInputPhase);
        }, 800);
      }, 600);
    });
  }, 1000);
}

/* =====================================================
   ФАЗА ДЕМОНСТРАЦИИ
   ===================================================== */
/**
 * Анимирует fullSequence по одному сигналу.
 * После последнего вызывает callback.
 */
function runDemoPhase(index, callback) {
  if (index >= state.fullSequence.length) {
    callback();
    return;
  }
  const item   = state.fullSequence[index];
  const cfg    = DIFFICULTY[state.difficulty];
  const delay  = item.real ? cfg.signalDelay : cfg.falseDelay;
  const pause  = cfg.pauseDelay;

  activateDevice(item.id, item.real);
  if (item.real) playSound('signal'); else playSound('false');

  setTimeout(() => {
    deactivateDevice(item.id, item.real);
    setTimeout(() => {
      runDemoPhase(index + 1, callback);
    }, pause);
  }, delay);
}

/* =====================================================
   ФАЗА ВВОДА
   ===================================================== */
function startInputPhase() {
  state.phase       = 'input';
  state.playerInput = [];

  renderInputSequence();
  updateHUD();
  setDevicesClickable(true);

  $('btn-reset').classList.remove('hidden');

  // Дуэль: показываем кнопку Подстава если не использована и противник ещё не ходил
  if (state.mode === 'duel' && !state.sabotageUsed) {
    $('btn-sabotage').classList.remove('hidden');
    $('btn-sabotage').disabled = false;
  }

  showPhaseOverlay('🖱 ВВОДИ');
  setTimeout(hidePhaseOverlay, 900);

  // Таймер ввода: timerBase + номер раунда секунд
  const totalTime = DIFFICULTY[state.difficulty].timerBase + state.round;
  startTimer(totalTime, () => {
    // Время вышло — провал
    handleInputTimeout();
  });
}

/* =====================================================
   ОБРАБОТКА КЛИКОВ НА УСТРОЙСТВА
   ===================================================== */
function handleDeviceClick(devId) {
  if (state.phase !== 'input') return;
  initAudio();
  playSound('click');

  const expectedId = state.trueSequence[state.playerInput.length];

  if (devId === expectedId) {
    // Верный клик
    state.playerInput.push(devId);
    addToInputSequence(devId, true);
    triggerDeviceAnim(devId, 'clicked');

    if (state.playerInput.length === state.trueSequence.length) {
      // Вся последовательность введена верно
      handleRoundSuccess();
    }
  } else {
    // Ошибочный клик
    triggerDeviceAnim(devId, 'wrong');
    addToInputSequence(devId, false);
    playSound('wrong');

    // Увеличиваем стресс
    state.stressLevel = Math.min(100, state.stressLevel + 34);
    updateStress();

    if (state.stressLevel >= 100) {
      // Стресс-шкала заполнена — провал раунда
      handleRoundFailure('stress');
    }
  }
}

/* =====================================================
   УСПЕХ / ПРОВАЛ РАУНДА
   ===================================================== */
function handleRoundSuccess() {
  clearTimer();
  setDevicesClickable(false);
  playSound('correct');

  const player = state.players[state.currentPlayer];
  player.maxRound = Math.max(player.maxRound, state.round);

  if (state.mode === 'solo') {
    showResult('✅', 'УГРОЗА НЕЙТРАЛИЗОВАНА',
      `Раунд ${state.round} пройден. Баланс: ${formatBalance(player.balance)}`,
      () => {
        state.round++;
        startRound();
      }
    );
  } else {
    // Дуэль: передаём ход второму игроку
    handleDuelTurn(true);
  }
}

function handleRoundFailure(reason) {
  clearTimer();
  setDevicesClickable(false);
  playSound('wrong');

  const player   = state.players[state.currentPlayer];
  const penalty  = 10_000 * state.round;
  player.balance = Math.max(0, player.balance - penalty);
  player.maxRound = Math.max(player.maxRound, state.round);

  if (state.mode === 'solo') {
    if (player.balance <= 0) {
      endGame();
    } else {
      showResult('❌', 'УТЕЧКА СРЕДСТВ',
        `Штраф: -${formatBalance(penalty)}. Баланс: ${formatBalance(player.balance)}`,
        () => {
          state.round++;
          startRound();
        }
      );
    }
  } else {
    handleDuelTurn(false);
  }
}

function handleInputTimeout() {
  handleRoundFailure('timeout');
}

/* =====================================================
   ДУЭЛЬНАЯ ЛОГИКА
   ===================================================== */
/**
 * passed: true — игрок прошёл, false — провалился
 */
function handleDuelTurn(passed) {
  const cp = state.currentPlayer;
  state.duelResult.push({ player: cp, passed });

  // Если ходили оба игрока на текущем раунде
  const roundResults = state.duelResult.filter((_, i) =>
    state.duelResult.length - i <= 2
  );

  // Если это ход первого игрока — передаём ходы второму
  if (cp === 0) {
    if (!passed) {
      // Первый провалился — оба на одном уровне, передаём ход второму
      state.currentPlayer = 1;
      showResult('❌', `${state.players[0].name} провалился!`,
        `Штраф: -${formatBalance(10_000 * state.round)}. Ход к ${state.players[1].name}`,
        () => startRound()
      );
    } else {
      // Первый прошёл — ход к второму
      state.currentPlayer = 1;
      showResult('✅', `${state.players[0].name} — ЧИСТО!`,
        `Теперь ход к ${state.players[1].name}`,
        () => startRound()
      );
    }
  } else {
    // Второй завершил раунд
    const p1 = state.duelResult[state.duelResult.length - 2];
    const p2 = { player: 1, passed };

    if (!p1?.passed && !p2.passed) {
      // Оба проиграли — штрафы обоим, повтор раунда
      showResult('💥', 'ОБА ПРОВАЛИЛИСЬ!',
        'Штрафы обоим. Раунд повторяется.',
        () => {
          state.currentPlayer = 0;
          state.round++;
          startRound();
        }
      );
    } else if (!p2.passed && p1?.passed) {
      // Второй проиграл
      showResult('🏆', `ПОБЕДИТЕЛЬ: ${state.players[0].name}!`,
        `${state.players[1].name} допустил ошибку.`,
        () => endDuel(0)
      );
    } else if (!p1?.passed && p2.passed) {
      // Первый проиграл
      showResult('🏆', `ПОБЕДИТЕЛЬ: ${state.players[1].name}!`,
        `${state.players[0].name} допустил ошибку.`,
        () => endDuel(1)
      );
    } else {
      // Оба прошли — следующий раунд
      showResult('⚔️', 'НИ ОДИН НЕ СЛОМАЛСЯ!',
        `Раунд ${state.round} взят обоими. Переходим дальше.`,
        () => {
          state.currentPlayer = 0;
          state.round++;
          startRound();
        }
      );
    }
  }
}

function endDuel(winnerIdx) {
  playSound('gameover');
  const winner = state.players[winnerIdx];

  $('go-title').textContent = `🏆 ${winner.name.toUpperCase()}`;
  $('go-desc').textContent  = 'Победитель оперативной дуэли!';
  $('go-stats').innerHTML   = `
    <div class="stat-block">
      <span class="stat-label">РАУНДЫ</span>
      <span class="stat-value">${state.round}</span>
    </div>
  `;

  renderLeaderboard();
  showScreen('gameover');
}

/* =====================================================
   КОНЕЦ ОДИНОЧНОЙ ИГРЫ
   ===================================================== */
function endGame() {
  playSound('gameover');
  const player = state.players[0];

  saveScore(player.name, player.maxRound);

  $('go-title').textContent = 'ПРОВАЛ ОПЕРАЦИИ';
  $('go-desc').textContent  = `${player.name}, баланс исчерпан. Операция закрыта.`;
  $('go-stats').innerHTML   = `
    <div class="stat-block">
      <span class="stat-label">МАХ. РАУНД</span>
      <span class="stat-value">${player.maxRound}</span>
    </div>
    <div class="stat-block">
      <span class="stat-label">ОСТАТОК</span>
      <span class="stat-value">${formatBalance(player.balance)}</span>
    </div>
  `;

  renderLeaderboard();
  showScreen('gameover');
}

/* =====================================================
   ТАЙМЕР
   ===================================================== */
function startTimer(seconds, onExpire) {
  clearTimer();
  state.timerRemaining = seconds;

  const totalMs  = seconds * 1000;
  const startedAt = Date.now();

  function tick() {
    const elapsed = Date.now() - startedAt;
    const left    = Math.max(0, totalMs - elapsed);
    const pct     = left / totalMs;

    $('timer-bar').style.width = `${pct * 100}%`;
    $('timer-label').textContent = `${Math.ceil(left / 1000)}с`;

    // Тикаем на последних 3 секундах
    if (left <= 3000 && left % 1000 < 80) playSound('countdown');

    if (left <= 0) {
      clearTimer();
      onExpire();
    } else {
      state.timerInterval = requestAnimationFrame(tick);
    }
  }

  state.timerInterval = requestAnimationFrame(tick);
}

function clearTimer() {
  if (state.timerInterval) {
    cancelAnimationFrame(state.timerInterval);
    state.timerInterval = null;
  }
  $('timer-bar').style.width = '100%';
  $('timer-label').textContent = '';
}

/* =====================================================
   КНОПКА «ПОДСТАВА» (дуэль)
   ===================================================== */
$('btn-sabotage').addEventListener('click', () => {
  if (state.sabotageUsed) return;
  playSound('sabotage');
  state.sabotageUsed  = true;
  state.duelSabotage  = true;
  $('btn-sabotage').disabled = true;
  $('btn-sabotage').textContent = '💣 Подстава активна!';

  // Визуальный эффект
  $('phase-overlay-text').textContent = '💣 ПОДСТАВА!';
  $('phase-overlay').classList.remove('hidden');
  setTimeout(() => $('phase-overlay').classList.add('hidden'), 1000);
});

/* =====================================================
   КНОПКА «СБРОС ВВОДА»
   ===================================================== */
$('btn-reset').addEventListener('click', () => {
  if (state.phase !== 'input') return;
  state.playerInput = [];
  renderInputSequence();
  playSound('click');
});

/* =====================================================
   UI УТИЛИТЫ — устройства
   ===================================================== */
function setDevicesClickable(enable) {
  DEVICES.forEach(d => {
    const el = $(`dev-${d.id}`);
    if (!el) return;
    el.style.cursor = enable ? 'pointer' : 'default';
    el.style.pointerEvents = enable ? 'all' : 'none';
  });
}

function activateDevice(id, isReal) {
  const el = $(`dev-${id}`);
  if (!el) return;
  el.classList.add('active');
  if (!isReal) el.classList.add('false-signal');
}

function deactivateDevice(id) {
  const el = $(`dev-${id}`);
  if (!el) return;
  el.classList.remove('active', 'false-signal');
}

function triggerDeviceAnim(id, type) {
  const el = $(`dev-${id}`);
  if (!el) return;
  el.classList.remove('clicked', 'wrong');
  // Принудительный reflow для перезапуска анимации
  void el.offsetWidth;
  el.classList.add(type);
  setTimeout(() => el.classList.remove(type), 400);
}

/* =====================================================
   UI УТИЛИТЫ — HUD
   ===================================================== */
function updateHUD() {
  const p = state.players[state.currentPlayer];
  $('balance-value').textContent   = state.mode === 'solo'
    ? formatBalance(p.balance)
    : `${p.name}`;
  $('round-value').textContent     = state.round;
  $('player-name-value').textContent = p.name;
  $('phase-value').textContent     = phaseLabel(state.phase);
  $('diff-value').textContent      = DIFFICULTY[state.difficulty].label;
}

function phaseLabel(phase) {
  return { demo: 'НАБЛЮДЕНИЕ', input: 'ВВОД', idle: '—' }[phase] || phase.toUpperCase();
}

function formatBalance(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function updateStress() {
  $('stress-fill').style.width = `${state.stressLevel}%`;
  if (state.stressLevel >= 80) {
    $('stress-fill').style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  } else {
    $('stress-fill').style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
  }
}

/* =====================================================
   UI — Введённая последовательность
   ===================================================== */
function renderInputSequence() {
  const container = $('input-sequence');
  container.innerHTML = '';

  // Показываем сколько нужно ввести (пустые слоты)
  const total = state.trueSequence.length;

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.classList.add('seq-icon');

    if (i < state.playerInput.length) {
      const devId = state.playerInput[i];
      slot.textContent = DEVICES[devId].emoji;
      // Проверяем верность
      if (devId === state.trueSequence[i]) {
        slot.classList.add('correct');
      } else {
        slot.classList.add('wrong');
      }
    } else {
      slot.textContent = '·';
    }
    container.appendChild(slot);
  }
}

function addToInputSequence(devId, isCorrect) {
  renderInputSequence();
}

/* =====================================================
   UI — Оверлеи фаз
   ===================================================== */
function showPhaseOverlay(text) {
  $('phase-overlay-text').textContent = text;
  $('phase-overlay').classList.remove('hidden');
}

function hidePhaseOverlay() {
  $('phase-overlay').classList.add('hidden');
}

/* =====================================================
   UI — Дуэльный баннер
   ===================================================== */
function updateDuelBanner() {
  // Удаляем старый баннер если есть
  const old = document.querySelector('.duel-turn-banner');
  if (old) old.remove();

  if (state.mode !== 'duel') return;

  const banner = document.createElement('div');
  banner.className = 'duel-turn-banner fade-in';
  banner.textContent = `⚔️ ХОД: ${state.players[state.currentPlayer].name}`;
  $('office-room').appendChild(banner);
}

/* =====================================================
   ЭКРАН РЕЗУЛЬТАТА РАУНДА
   ===================================================== */
function showResult(icon, title, desc, onContinue) {
  showScreen('result');
  $('result-icon').textContent  = icon;
  $('result-title').textContent = title;
  $('result-desc').textContent  = desc;
  $('result-stats').innerHTML   = '';

  const btn = $('btn-continue');
  // Снимаем предыдущие обработчики клонированием кнопки
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    playSound('click');
    showScreen('game');
    onContinue();
  });
}

/* =====================================================
   ТАБЛИЦА РЕКОРДОВ
   ===================================================== */
function saveScore(name, maxRound) {
  const key   = DIFFICULTY[state.difficulty].lsKey;
  const board = getLeaderboardByDiff(state.difficulty);
  board.push({ name, maxRound, date: new Date().toLocaleDateString('ru-RU') });
  board.sort((a, b) => b.maxRound - a.maxRound);
  localStorage.setItem(key, JSON.stringify(board.slice(0, 15)));
}

function getLeaderboardByDiff(diff) {
  const key = DIFFICULTY[diff]?.lsKey || DIFFICULTY.medium.lsKey;
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch { return []; }
}

// Обратная совместимость — используется на экране gameover
function getLeaderboard() {
  return getLeaderboardByDiff(state.difficulty);
}

function renderLeaderboard() {
  const board = getLeaderboard();
  const tbody = $('leaderboard-body');
  tbody.innerHTML = '';

  if (board.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim);text-align:center">Рекордов пока нет</td></tr>';
    return;
  }

  board.forEach((entry, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(entry.name)}</td>
      <td>${entry.maxRound}</td>
      <td>${entry.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* =====================================================
   КНОПКА «НОВАЯ ОПЕРАЦИЯ»
   ===================================================== */
$('btn-restart').addEventListener('click', () => {
  playSound('click');
  showScreen('start');
});

/* =====================================================
   НАВЕШИВАЕМ КЛИКИ НА УСТРОЙСТВА
   ===================================================== */
DEVICES.forEach(d => {
  const el = $(`dev-${d.id}`);
  if (!el) return;
  el.addEventListener('click', () => {
    if (state.phase !== 'input') return;
    handleDeviceClick(d.id);
  });
});

/* =====================================================
   ИНИЦИАЛИЗАЦИЯ
   ===================================================== */
showScreen('start');
