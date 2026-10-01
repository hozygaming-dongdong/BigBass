const symbols = ['truck', 'rod', 'dragonfly', 'tackle', 'fish', 'a', 'k', 'q', 'j', 'ten'];
const paylines = [[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3],[0,1,2,1,0],[1,2,3,2,1],[3,2,1,2,3],[2,1,0,1,2],[0,0,1,0,0],[1,1,2,1,1],[2,2,1,2,2],[3,3,2,3,3],[0,1,1,1,0],[1,2,2,2,1],[2,3,3,3,2],[3,2,2,2,3],[0,1,0,1,0],[1,2,1,2,1],[2,3,2,3,2],[3,2,3,2,3]];
const payouts = { truck: { 3: 10, 4: 40, 5: 400 }, rod: { 3: 6, 4: 30, 5: 200 }, dragonfly: { 3: 4, 4: 20, 5: 100 }, tackle: { 3: 4, 4: 20, 5: 100 }, fish: { 3: 2, 4: 10, 5: 40 }, a: { 3: .4, 4: 5, 5: 20 }, k: { 3: .4, 4: 5, 5: 20 }, q: { 3: .4, 4: 2, 5: 10 }, j: { 3: .4, 4: 2, 5: 10 }, ten: { 3: .4, 4: 2, 5: 10 } };
const featureOdds = { moneyFish: .05, bigFish: .01, goldBigFish: .002, hook: .16, fisherman: .025 };
const fishPayout = { moneyMin: .2, moneyMax: 5, bigMin: 8, bigMax: 40, goldMultiplier: 5 };
const reels = document.querySelector('#reels');
const spinButton = document.querySelector('#spinButton');
const status = document.querySelector('#status');
const balanceValue = document.querySelector('#balanceValue');
const betValue = document.querySelector('#betValue');
const winLabel = document.querySelector('#winLabel');
const modeLabel = document.querySelector('#modeLabel');
const hero = document.querySelector('.hero');
const betButtons = document.querySelectorAll('.bet-control button');
let balance = 100, bet = 1, spinning = false, pullState = null;
let audioContext, musicTimer, soundOn = true;

function ensureAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function tone(frequency, duration, type = 'sine', volume = .035, delay = 0) { if (!soundOn) return; ensureAudio(); const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + delay; oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .02); gain.gain.exponentialRampToValueAtTime(.0001, start + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration + .03); }
function startMusic(mode = 'base') { if (!soundOn) return; ensureAudio(); clearInterval(musicTimer); const notes = mode === 'event' ? [196,247,294,330,392,494,587,494] : [220,262,330,392]; let index = 0; const beat = mode === 'event' ? 190 : 720; const play = () => { const note = notes[index++ % notes.length]; tone(note, mode === 'event' ? .16 : .32, 'triangle', mode === 'event' ? .045 : .022); if (mode === 'event') { tone(note / 2, .2, 'sawtooth', .025, .02); tone(note * 2, .08, 'square', .018, .06); } }; play(); musicTimer = setInterval(play, beat); }
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
function soundEffect(name) { const effects = { spin: [[180,.12,'sawtooth',.04,0],[260,.12,'sawtooth',.03,.1]], hook: [[520,.12,'triangle',.05,0],[760,.18,'triangle',.05,.12]], pull: [[180,.16,'sawtooth',.05,0],[120,.2,'square',.035,.12]], win: [[392,.14,'triangle',.05,0],[523,.14,'triangle',.05,.12],[784,.28,'triangle',.06,.24]], fail: [[180,.2,'sawtooth',.04,0],[120,.35,'sawtooth',.035,.2]] }; (effects[name] || []).forEach(note => tone(...note)); }

function randomSymbol() { return symbols[Math.floor(Math.random() * symbols.length)]; }
function symbolMarkup(symbol) { return `<span class="source-symbol symbol-${symbol}" aria-label="${symbol}"></span>`; }
function bigFishMarkup(key, segments, gold = false) { return `<span class="big-fish-stack${gold ? ' gold-fish' : ''}" data-fish-key="${key}" style="--fish-parts:${segments};height:62px"><span class="big-fish-part head"></span><b class="big-fish-tag">???$</b></span>`; }
function expandBigFish(stack, segments) {
  const parts = Array.from({ length: segments - 1 }, (_, index) => `<span class="big-fish-part ${index === segments - 2 ? 'tail' : 'body'} hidden"></span>`).join('');
  stack.querySelector('.big-fish-tag').insertAdjacentHTML('beforebegin', parts);
  stack.style.height = `${62 + (segments - 1) * 23}px`;
}
function createGrid() {
  const grid = Array.from({ length: 5 }, () => Array.from({ length: 4 }, randomSymbol));
  const moneyValues = {}, bigFishValues = {}, bigFishSizes = {}, goldFishValues = {}, goldFishSizes = {};
  const bonusMarkers = Array.from({ length: 5 }, () => Math.random() < featureOdds.fisherman ? 'fisherman' : Math.random() < featureOdds.hook ? 'hook' : 'empty');
  let bigFishPlaced = false;
  grid.forEach((rows, reelIndex) => rows.forEach((symbol, rowIndex) => {
    const key = `${reelIndex}-${rowIndex}`;
    if (!bigFishPlaced && Math.random() < featureOdds.goldBigFish) {
      grid[reelIndex][rowIndex] = 'gold-big-fish';
      bigFishPlaced = true;
      goldFishSizes[key] = Math.random() < .5 ? 5 : 9;
      goldFishValues[key] = bet * (fishPayout.bigMin + Math.floor(Math.random() * (fishPayout.bigMax - fishPayout.bigMin + 1))) * fishPayout.goldMultiplier;
    } else if (!bigFishPlaced && Math.random() < featureOdds.bigFish) {
      grid[reelIndex][rowIndex] = 'big-fish';
      bigFishPlaced = true;
      bigFishSizes[key] = Math.random() < .5 ? 5 : 9;
      bigFishValues[key] = bet * (fishPayout.bigMin + Math.floor(Math.random() * (fishPayout.bigMax - fishPayout.bigMin + 1)));
    } else if (Math.random() < featureOdds.moneyFish) {
      grid[reelIndex][rowIndex] = 'money-fish';
      moneyValues[key] = bet * (fishPayout.moneyMin + Math.floor(Math.random() * ((fishPayout.moneyMax - fishPayout.moneyMin) * 10 + 1)) / 10);
    }
  }));
  return { grid, moneyValues, bigFishValues, bigFishSizes, goldFishValues, goldFishSizes, bonusMarkers };
}
function drawReels({ grid, moneyValues, bigFishSizes, goldFishSizes, bonusMarkers } = createGrid()) {
  reels.innerHTML = grid.map((rows, reelIndex) => `<div class="reel"><div class="cell bonus">${symbolMarkup(bonusMarkers[reelIndex])}</div>${rows.map((symbol, rowIndex) => { const key = `${reelIndex}-${rowIndex}`; const content = symbol === 'big-fish' ? bigFishMarkup(key, bigFishSizes[key]) : symbol === 'gold-big-fish' ? bigFishMarkup(key, goldFishSizes[key], true) : `${symbolMarkup(symbol)}${symbol === 'money-fish' ? `<b class="money-tag">$${moneyValues[key].toFixed(2)}</b>` : ''}`; return `<div class="cell" data-symbol="${symbol}">${content}</div>`; }).join('')}</div>`).join('');
}
function evaluateGrid(grid) {
  const wins = [];
  paylines.forEach((line, lineIndex) => {
    const symbol = grid[0][line[0]];
    if (symbol === 'money-fish' || symbol === 'big-fish' || symbol === 'gold-big-fish') return;
    let count = 1;
    while (count < 5 && grid[count][line[count]] === symbol) count += 1;
    if (count >= 3) wins.push({ lineIndex: lineIndex + 1, line, symbol, count, win: payouts[symbol][count] || 0 });
  });
  return wins;
}
function setMoney(element, value) { element.textContent = value.toFixed(2); }
function setPullMode(active) {
  spinButton.innerHTML = active ? '<span>PULL</span><small>REEL THE CATCH</small>' : '<span>SPIN</span><small>PRESS TO CAST</small>';
  betButtons.forEach(button => { button.disabled = active; });
}
function finishSpin(totalWin, catches, wins) {
  hero.classList.remove('fishing-action', 'reeling');
  spinButton.classList.remove('pull-ready');
  pullState = null;
  setPullMode(false);
  balance += totalWin;
  setMoney(balanceValue, balance);
  setMoney(winLabel, totalWin);
  const escaped = catches.some(item => item.type === 'big' && !item.success);
  startMusic('base');
  soundEffect(escaped ? 'fail' : totalWin ? 'win' : 'fail');
  modeLabel.textContent = totalWin ? `${wins.length + (catches.length ? 1 : 0)} WIN EVENT` : '20 PAYLINES';
  status.textContent = escaped ? '大魚逃走了，0.00！' : catches.length ? `釣起 ${catches.reduce((total, item) => total + item.amount, 0).toFixed(2)}！總贏分 ${totalWin.toFixed(2)}` : totalWin ? `第 ${wins.map(result => result.lineIndex).join('、')} 線中獎！贏得 ${totalWin.toFixed(2)}` : '沒有連線，再試一次！';
  spinButton.disabled = false;
  spinning = false;
}
function revealFishStack(stack, revealed) { stack.querySelectorAll('.big-fish-part').forEach((part, index) => part.classList.toggle('hidden', index >= revealed)); }
function pullFish() {
  if (!pullState) return;
  soundEffect('pull');
  spinButton.classList.remove('pull-ready');
  const { fish, catches, wins, lineWin } = pullState;
  pullState.step += 1;
  const revealed = Math.min(fish.segments, pullState.step + 1);
  const cell = reels.children[fish.reelIndex].children[fish.rowIndex + 1];
  const stack = cell.querySelector('.big-fish-stack');
  revealFishStack(stack, revealed);
  stack.classList.remove('big-fish-growing');
  hero.classList.remove('reeling');
  void hero.offsetWidth;
  hero.classList.add('reeling');
  stack.classList.add('big-fish-growing');
  const shown = Math.round(fish.target * pullState.step / pullState.totalPulls);
  stack.querySelector('.big-fish-tag').textContent = `$${shown}`;
  status.textContent = `用力捲線中… PULL ${pullState.step}/${pullState.totalPulls} · $${shown}`;
  if (pullState.step < pullState.totalPulls) return;
  spinButton.disabled = true;
  setTimeout(() => {
    fish.amount = fish.success ? fish.target : 0;
    stack.classList.remove('big-fish-growing');
    if (fish.success) stack.querySelector('.big-fish-tag').textContent = `$${fish.target}`;
    else { revealFishStack(stack, 1); stack.classList.add('big-fish-fail'); stack.querySelector('.big-fish-tag').textContent = '$0'; }
    setTimeout(() => finishSpin(lineWin + catches.reduce((total, item) => total + item.amount, 0), catches, wins), 700);
  }, 900);
}
function startBigFishEvent(fish, catches, wins, lineWin) {
  pullState = { fish, catches, wins, lineWin, step: 0, totalPulls: fish.segments - 1 };
  spinning = false;
  hero.classList.add('fishing-action');
  startMusic('event');
  soundEffect('hook');
  modeLabel.textContent = 'BIG FISH';
  status.textContent = `大魚上鉤！點擊發亮的 PULL 開始拉線 0/${pullState.totalPulls}`;
  setPullMode(true);
  spinButton.classList.add('pull-ready');
  spinButton.disabled = false;
}
function spin() {
  if (pullState || spinning || balance < bet) return;
  ensureAudio();
  startMusic('base');
  soundEffect('spin');
  spinning = true;
  balance -= bet;
  setMoney(balanceValue, balance);
  spinButton.disabled = true;
  status.textContent = '拋竿中…';
  modeLabel.textContent = 'CASTING';
  document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('win', 'big-fish-fail'));
  let ticks = 0;
  const timer = setInterval(() => {
    drawReels();
    ticks += 1;
    if (ticks < 8) return;
    clearInterval(timer);
    const { grid, moneyValues, bigFishValues, bigFishSizes, goldFishValues, goldFishSizes, bonusMarkers } = createGrid();
    drawReels({ grid, moneyValues, bigFishSizes, goldFishSizes, bonusMarkers });
    const wins = evaluateGrid(grid);
    const lineWin = bet * wins.reduce((total, result) => total + result.win, 0);
    const catches = [];
    const fishermanTriggered = bonusMarkers.includes('fisherman');
    bonusMarkers.forEach((marker, reelIndex) => {
      if (!fishermanTriggered && marker !== 'hook') return;
      grid[reelIndex].forEach((symbol, rowIndex) => {
        const key = `${reelIndex}-${rowIndex}`;
        if (symbol === 'money-fish') catches.push({ type: 'money', reelIndex, rowIndex, amount: moneyValues[key] });
        if (symbol === 'big-fish') catches.push({ type: 'big', reelIndex, rowIndex, amount: 0, target: bigFishValues[key], segments: bigFishSizes[key], success: Math.random() < .6 });
        if (symbol === 'gold-big-fish') catches.push({ type: 'big', gold: true, reelIndex, rowIndex, amount: 0, target: goldFishValues[key], segments: goldFishSizes[key], success: Math.random() < .6 });
      });
    });
    if (lineWin) wins.forEach(result => result.line.slice(0, result.count).forEach((row, reelIndex) => reels.children[reelIndex].children[row + 1].classList.add('win')));
    catches.forEach(({ type, reelIndex, rowIndex }) => {
      const cell = reels.children[reelIndex].children[rowIndex + 1];
      cell.classList.add(type === 'big' ? 'big-fish-caught' : 'fish-caught');
      if (type === 'big') expandBigFish(cell.querySelector('.big-fish-stack'), catches.find(item => item.reelIndex === reelIndex && item.rowIndex === rowIndex).segments);
      reels.children[reelIndex].children[0].classList.add(fishermanTriggered ? 'fisherman-hit' : 'hook-hit');
    });
    const fish = catches.find(item => item.type === 'big');
    const continueEvent = () => fish ? startBigFishEvent(fish, catches, wins, lineWin) : finishSpin(lineWin + catches.reduce((total, item) => total + item.amount, 0), catches, wins);
    if (fishermanTriggered && catches.length) {
      status.textContent = `漁夫出現！正在收集 ${catches.filter(item => item.type === 'money').length} 條魚…`;
      setTimeout(continueEvent, fish ? 1050 : 800);
    } else continueEvent();
  }, 85);
}

document.querySelector('#betDown').addEventListener('click', () => { bet = Math.max(0.5, bet - 0.5); setMoney(betValue, bet); });
document.querySelector('#betUp').addEventListener('click', () => { bet = Math.min(5, bet + 0.5); setMoney(betValue, bet); });
spinButton.addEventListener('click', () => pullState ? pullFish() : spin());
document.querySelector('#helpButton').addEventListener('click', () => document.querySelector('#helpDialog').showModal());
document.querySelector('#closeHelp').addEventListener('click', () => document.querySelector('#helpDialog').close());
document.querySelector('#soundButton').addEventListener('click', event => {
  soundOn = !soundOn;
  event.currentTarget.textContent = soundOn ? '♫' : '🔇';
  if (soundOn) startMusic(pullState ? 'event' : 'base'); else stopMusic();
});
let lastTouchEnd = 0;
document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
document.addEventListener('touchend', event => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('pointerdown', () => { if (soundOn) startMusic(pullState ? 'event' : 'base'); }, { once: true });
drawReels();
