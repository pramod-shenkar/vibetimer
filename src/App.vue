<script setup>
import { ref, computed, onUnmounted } from 'vue'

const intervalSec = ref(30)
const durationMin = ref(10)
const running = ref(false)
const elapsed = ref(0)
const nextVibIn = ref(0)

let intervalId = null
let tickId = null
let endTime = null
let nextVibeTime = null
let wakeLock = null

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

async function start() {
  const durationMs = durationMin.value * 60 * 1000
  const intervalMs = intervalSec.value * 1000
  endTime = Date.now() + durationMs
  nextVibeTime = Date.now() + intervalMs
  running.value = true
  elapsed.value = 0
  nextVibIn.value = intervalSec.value

  await acquireWakeLock()

  intervalId = setInterval(() => {
    if (Date.now() >= endTime) return stop()
    navigator.vibrate(300)
    nextVibeTime = Date.now() + intervalMs
  }, intervalMs)

  tickId = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - (endTime - durationMs)) / 1000)
    nextVibIn.value = Math.max(0, Math.ceil((nextVibeTime - Date.now()) / 1000))
    if (Date.now() >= endTime) stop()
  }, 500)
}

function stop() {
  clearInterval(intervalId)
  clearInterval(tickId)
  intervalId = null
  tickId = null
  endTime = null
  nextVibeTime = null
  running.value = false
  elapsed.value = 0
  nextVibIn.value = 0
  releaseWakeLock()
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
    </template>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0d0d0f;
  color: #e2e2e8;
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
  background: #16161d;
  border: 1px solid #2a2a38;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  box-shadow: 0 8px 40px rgba(0,0,0,.6);
}

.title {
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  color: #a78bfa;
  letter-spacing: .02em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

label {
  font-size: .85rem;
  color: #8888aa;
  font-weight: 500;
}

input[type=number] {
  width: 100%;
  padding: .75rem 1rem;
  background: #0d0d14;
  border: 1px solid #2e2e42;
  border-radius: 10px;
  color: #e2e2e8;
  font-size: 1.1rem;
  outline: none;
  transition: border-color .2s;
}

input[type=number]:focus {
  border-color: #7c3aed;
}

.btn {
  width: 100%;
  padding: .9rem;
  border: none;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: .08em;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}

.btn:active { transform: scale(.97); opacity: .85; }

.btn-start {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
}

.btn-stop {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
}

.locked-info {
  display: flex;
  justify-content: space-between;
  font-size: .9rem;
  color: #8888aa;
  background: #0d0d14;
  border-radius: 10px;
  padding: .6rem 1rem;
}

.status { font-size: .95rem; color: #8888aa; }
.status.running { color: #a3e635; }
.dot { animation: pulse 1.2s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}

.elapsed { font-size: 1rem; color: #c4c4d4; font-variant-numeric: tabular-nums; }

.next {
  font-size: 1.1rem;
  font-weight: 600;
  color: #a78bfa;
  text-align: center;
}
</style>
