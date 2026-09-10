<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const intervalSec = ref(10)
const durationMin = ref(15)
const vibeMode = ref('triple')
const tingEnabled = ref(false)
const running = ref(false)
const elapsed = ref(0)
const nextVibIn = ref(0)

const vibeModes = [
  { value: 'single', label: 'Single', pattern: [300] },
  { value: 'double', label: 'Double', pattern: [200, 100, 200] },
  { value: 'triple', label: 'Triple', pattern: [200, 100, 200, 100, 200] },
]

let tickId = null
let endTime = null
let startTime = null
let nextVibeTime = null
let wakeLock = null
let audioCtx = null
let silentNode = null
const backgrounded = ref(false)

const worker = new Worker(new URL('./vibe-worker.js', import.meta.url), { type: 'module' })

worker.onmessage = (e) => {
  if (e.data.type === 'vibrate') {
    vibrate()
    playTing()
    nextVibeTime = Date.now() + intervalSec.value * 1000
  }
  if (e.data.type === 'done') stop()
}

function vibrate() {
  const mode = vibeModes.find(m => m.value === vibeMode.value)
  navigator.vibrate(mode.pattern)
}

function playBell(when) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.type = 'sine'
  osc.frequency.value = 1047
  gain.gain.setValueAtTime(1, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.9)
  osc.start(when)
  osc.stop(when + 0.9)
}

function playTing() {
  if (!tingEnabled.value || !audioCtx) return
  const now = audioCtx.currentTime
  playBell(now)
  playBell(now + 0.28)
}

// Keeps audio context alive to reduce browser throttling when backgrounded
function startSilentAudio() {
  try {
    audioCtx = new AudioContext()
    const scheduleSilent = () => {
      if (!running.value) return
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate)
      silentNode = audioCtx.createBufferSource()
      silentNode.buffer = buf
      silentNode.connect(audioCtx.destination)
      silentNode.onended = scheduleSilent
      silentNode.start()
    }
    scheduleSilent()
  } catch (_) {}
}

function stopSilentAudio() {
  try {
    silentNode?.stop()
    audioCtx?.close()
  } catch (_) {}
  silentNode = null
  audioCtx = null
}

async function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch (_) {}
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

function onVisibilityChange() {
  if (!running.value) return
  if (document.visibilityState === 'hidden') {
    backgrounded.value = true
  } else {
    backgrounded.value = false
    acquireWakeLock()
    if (Date.now() >= endTime) { stop(); return }
    if (Date.now() >= nextVibeTime) {
      vibrate()
      const intervalMs = intervalSec.value * 1000
      while (nextVibeTime <= Date.now()) nextVibeTime += intervalMs
    }
  }
}

onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibilityChange))

async function start() {
  const durationMs = durationMin.value * 60 * 1000
  const intervalMs = intervalSec.value * 1000
  startTime = Date.now()
  endTime = startTime + durationMs
  nextVibeTime = startTime + intervalMs
  running.value = true
  elapsed.value = 0
  nextVibIn.value = intervalSec.value

  await acquireWakeLock()
  startSilentAudio()

  worker.postMessage({ type: 'start', intervalMs, endTime })

  tickId = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startTime) / 1000)
    nextVibIn.value = Math.max(0, Math.ceil((nextVibeTime - Date.now()) / 1000))
    if (Date.now() >= endTime) stop()
  }, 500)
}

function stop() {
  worker.postMessage({ type: 'stop' })
  clearInterval(tickId)
  tickId = null
  endTime = null
  startTime = null
  nextVibeTime = null
  running.value = false
  elapsed.value = 0
  nextVibIn.value = 0
  releaseWakeLock()
  stopSilentAudio()
}

onUnmounted(stop)


function fmt(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')
  return `${m}:${s}`
}

const elapsedFmt = computed(() => fmt(elapsed.value))
const totalFmt = computed(() => fmt(durationMin.value * 60))
</script>

<template>
  <div class="app">
    <h1 class="title">Session Vibe Timer</h1>

    <template v-if="!running">
      <div class="field">
        <label>Sound</label>
        <button class="sound-btn" :class="{ active: tingEnabled }" @click="tingEnabled = !tingEnabled">
          Ting-Ting &nbsp; {{ tingEnabled ? 'ON' : 'OFF' }}
        </button>
      </div>

      <div class="field">
        <label>Vibration Mode</label>
        <div class="vibe-modes">
          <button
            v-for="m in vibeModes"
            :key="m.value"
            class="mode-btn"
            :class="{ active: vibeMode === m.value }"
            @click="vibeMode = m.value"
          >{{ m.label }}</button>
        </div>
      </div>
      <div class="field">
        <label>Interval (sec)</label>
        <input type="number" v-model.number="intervalSec" min="1" max="3600" />
      </div>
      <div class="field">
        <label>Duration (min)</label>
        <input type="number" v-model.number="durationMin" min="1" max="180" />
      </div>
      <button class="btn btn-start" @click="start">START</button>
      <p class="status">Status: idle</p>
      <p class="elapsed">Elapsed: 00:00 / {{ totalFmt }}</p>
    </template>

    <template v-else>
      <div class="locked-info">
        <span>Interval: {{ intervalSec }}s</span>
        <span>Duration: {{ durationMin }}min</span>
      </div>
      <button class="btn btn-stop" @click="stop">STOP</button>
      <p class="status running">Status: running <span class="dot">●</span></p>
      <p class="elapsed">Elapsed: {{ elapsedFmt }} / {{ totalFmt }}</p>
      <p class="next">Next vibrate in: {{ nextVibIn }}s</p>
      <button class="sound-btn" :class="{ active: tingEnabled }" @click="tingEnabled = !tingEnabled">
        Ting-Ting &nbsp; {{ tingEnabled ? 'ON' : 'OFF' }}
      </button>
      <p v-if="backgrounded" class="warn">Screen locked — vibration resumes when unlocked</p>
      <p v-else class="hint">Screen stays on while running</p>
    </template>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0a0a0a;
  color: #c8c8c8;
  font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style scoped>
.app {
  width: min(420px, 92vw);
  background: #111111;
  border: 1px solid #1e1e1e;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  box-shadow: 0 8px 40px rgba(0,0,0,.8);
}

.title {
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  color: #c9a84c;
  letter-spacing: .02em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

label {
  font-size: .85rem;
  color: #525252;
  font-weight: 500;
}

input[type=number] {
  width: 100%;
  padding: .75rem 1rem;
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 10px;
  color: #c8c8c8;
  font-size: 1.1rem;
  outline: none;
  transition: border-color .2s;
}

input[type=number]:focus {
  border-color: #9a6e20;
}

.btn {
  width: 100%;
  padding: .9rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: .08em;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}

.btn:active { transform: scale(.97); opacity: .85; }

.btn-start {
  background: #160f00;
  border-color: #9a6e20;
  color: #c9a84c;
}

.btn-stop {
  background: #1a0404;
  border-color: #7f1d1d;
  color: #f87171;
}

.locked-info {
  display: flex;
  justify-content: space-between;
  font-size: .9rem;
  color: #525252;
  background: #0a0a0a;
  border-radius: 10px;
  padding: .6rem 1rem;
}

.status { font-size: .95rem; color: #525252; }
.status.running { color: #4ade80; }
.dot { animation: pulse 1.2s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}

.elapsed { font-size: 1rem; color: #888888; font-variant-numeric: tabular-nums; }

.next {
  font-size: 1.1rem;
  font-weight: 600;
  color: #c9a84c;
  text-align: center;
}

.vibe-modes {
  display: flex;
  gap: .5rem;
}

.mode-btn {
  flex: 1;
  padding: .6rem;
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 10px;
  color: #525252;
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}

.mode-btn.active {
  background: #160f00;
  border-color: #9a6e20;
  color: #c9a84c;
}

.sound-btn {
  width: 100%;
  padding: .6rem 1rem;
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 10px;
  color: #404040;
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  letter-spacing: .03em;
}

.sound-btn.active {
  background: #051205;
  border-color: #166534;
  color: #4ade80;
}

.hint {
  font-size: .78rem;
  color: #333333;
  text-align: center;
}

.warn {
  font-size: .82rem;
  font-weight: 600;
  color: #d97706;
  text-align: center;
  background: #110b00;
  border: 1px solid #78350f;
  border-radius: 8px;
  padding: .45rem .75rem;
}
</style>
