# Session Vibe Timer — Build Spec

Vue 3 + Vite PWA. Vibrates phone at fixed interval, session-bound (start/stop), no infinite loop. Use case: puja, bike rides.

## Stack
- Vue 3 (Composition API, `<script setup>`)
- No TypeScript, no Router, no Pinia, no tests, no linter
- `vite-plugin-pwa` for manifest/installability
- `navigator.vibrate()` — no native plugin needed

## Behavior
- Two inputs: interval (seconds), duration (minutes)
- Start → vibrates every N seconds until duration elapses or Stop pressed
- Stop → clears interval immediately, resets UI
- No background/foreground service — screen must stay on during session (acceptable, session is short)
- No persistence needed — no history, no settings save

## UI Layout (single screen)

```
┌─────────────────────────────┐
│      Session Vibe Timer      │
│                               │
│   Interval (sec)              │
│   ┌─────────────────────┐   │
│   │  30                  │   │
│   └─────────────────────┘   │
│                               │
│   Duration (min)              │
│   ┌─────────────────────┐   │
│   │  10                  │   │
│   └─────────────────────┘   │
│                               │
│   ┌─────────────────────┐   │
│   │      START            │   │
│   └─────────────────────┘   │
│                               │
│   Status: idle                │
│   Elapsed: 00:00 / 10:00      │
│                               │
└─────────────────────────────┘
```

### While running

```
┌─────────────────────────────┐
│      Session Vibe Timer      │
│                               │
│   Interval: 30s (locked)      │
│   Duration: 10min (locked)    │
│                               │
│   ┌─────────────────────┐   │
│   │       STOP             │   │
│   └─────────────────────┘   │
│                               │
│   Status: running ●           │
│   Elapsed: 03:20 / 10:00      │
│   Next vibrate in: 12s        │
│                               │
└─────────────────────────────┘
```

ui should be dark themed eyepleasing
app can be run when screenis lock too.

## Core logic

```js
let intervalId = null
let endTime = null

function start(intervalSec, durationMin) {
  endTime = Date.now() + durationMin * 60 * 1000
  intervalId = setInterval(() => {
    if (Date.now() >= endTime) return stop()
    navigator.vibrate(300)
  }, intervalSec * 1000)
}

function stop() {
  clearInterval(intervalId)
  intervalId = null
  endTime = null
}
```

## PWA manifest essentials
- `display: standalone`
- `start_url: /`
- 192x192 and 512x512 icons (placeholder solid-color PNGs fine, or generate via any online tool)

## Out of scope
- No sound option (vibrate-only by design)
- No auth, no backend, no analytics