const timeDisplay = document.getElementById("timeDisplay");
const statusLabel = document.getElementById("statusLabel");
const minutesInput = document.getElementById("minutesInput");
const secondsInput = document.getElementById("secondsInput");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const setBtn = document.getElementById("setBtn");
const clearAlarmBtn = document.getElementById("clearAlarmBtn");
const presetButtons = document.querySelectorAll(".chip");
const progressRing = document.querySelector(".dial-progress");

let totalSeconds = 0;
let remainingSeconds = 0;
let timerId = null;
let endTimestamp = null;
let running = false;
let audioContext = null;
let alarmInterval = null;
let alarmTimeout = null;
let alarmActive = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTime = (value) => {
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const seconds = String(value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const updateDisplay = () => {
  timeDisplay.textContent = formatTime(remainingSeconds);
  document.title = `${formatTime(remainingSeconds)} | Timer Studio`;
};

const updateProgress = () => {
  const radius = progressRing.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  if (totalSeconds === 0) {
    progressRing.style.strokeDashoffset = circumference;
    return;
  }
  const ratio = clamp(remainingSeconds / totalSeconds, 0, 1);
  progressRing.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
};

const setStatus = (label) => {
  statusLabel.textContent = label;
};

const setTimer = (minutes, seconds) => {
  const safeMinutes = clamp(minutes, 0, 99);
  const safeSeconds = clamp(seconds, 0, 59);
  totalSeconds = safeMinutes * 60 + safeSeconds;
  remainingSeconds = totalSeconds;
  minutesInput.value = safeMinutes;
  secondsInput.value = safeSeconds;
  updateDisplay();
  updateProgress();
  setStatus(totalSeconds > 0 ? "Ready" : "Set a time");
};

const syncInputs = () => {
  const minutes = Number(minutesInput.value || 0);
  const seconds = Number(secondsInput.value || 0);
  setTimer(minutes, seconds);
};

const tick = () => {
  const now = Date.now();
  const diff = Math.max(0, Math.round((endTimestamp - now) / 1000));
  remainingSeconds = diff;
  updateDisplay();
  updateProgress();
  if (remainingSeconds <= 0) {
    clearInterval(timerId);
    timerId = null;
    running = false;
    startBtn.textContent = "Start";
    setStatus("Done");
    playAlarm();
  }
};

const playAlarm = () => {
  if (alarmActive) {
    return;
  }
  alarmActive = true;
  setStatus("Alarm");
  clearAlarmBtn.disabled = false;
  clearAlarmBtn.classList.add("primary");
  clearAlarmBtn.classList.remove("ghost");
  startBtn.classList.remove("primary");
  startBtn.classList.add("ghost");
  alarmTimeout = setTimeout(stopAlarm, 60 * 1000);

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const strikeBell = () => {
      const now = audioContext.currentTime;
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      masterGain.connect(audioContext.destination);

      const partials = [
        { freq: 520, gain: 0.6 },
        { freq: 1040, gain: 0.3 },
        { freq: 1560, gain: 0.2 },
      ];

      partials.forEach((partial) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "sine";
        osc.frequency.value = partial.freq;
        gain.gain.value = partial.gain;
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.4);
      });
    };

    strikeBell();
    alarmInterval = setInterval(strikeBell, 200);
  } catch (error) {
    // Audio が利用不可/ブロックされても、ベル発火時に Clear Sound は活性化しておく。
  }
};

const stopAlarm = () => {
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  alarmActive = false;
  clearAlarmBtn.disabled = true;
  clearAlarmBtn.classList.remove("primary");
  clearAlarmBtn.classList.add("ghost");
  startBtn.classList.add("primary");
  startBtn.classList.remove("ghost");
};

const startTimer = () => {
  stopAlarm();
  if (running) {
    clearInterval(timerId);
    timerId = null;
    running = false;
    startBtn.textContent = "Start";
    setStatus("Paused");
    return;
  }

  if (remainingSeconds <= 0) {
    syncInputs();
  }

  if (remainingSeconds <= 0) {
    setStatus("Set a time");
    return;
  }

  endTimestamp = Date.now() + remainingSeconds * 1000;
  timerId = setInterval(tick, 250);
  running = true;
  startBtn.textContent = "Pause";
  setStatus("Running");
  tick();
};

const resetTimer = () => {
  clearInterval(timerId);
  timerId = null;
  running = false;
  startBtn.textContent = "Start";
  stopAlarm();
  setTimer(0, 0);
};

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const minutes = Number(button.dataset.minutes || 0);
    clearInterval(timerId);
    timerId = null;
    running = false;
    startBtn.textContent = "Start";
    stopAlarm();
    setTimer(minutes, 0);
  });
});

setBtn.addEventListener("click", () => {
  clearInterval(timerId);
  timerId = null;
  running = false;
  startBtn.textContent = "Start";
  stopAlarm();
  syncInputs();
});

startBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);
clearAlarmBtn.addEventListener("click", stopAlarm);

setTimer(Number(minutesInput.value), Number(secondsInput.value));
clearAlarmBtn.disabled = true;
