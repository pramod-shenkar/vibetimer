let intervalId = null

self.onmessage = (e) => {
  if (e.data.type === 'start') {
    const { intervalMs, endTime } = e.data
    clearInterval(intervalId)
    intervalId = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(intervalId)
        self.postMessage({ type: 'done' })
      } else {
        self.postMessage({ type: 'vibrate' })
      }
    }, intervalMs)
  } else if (e.data.type === 'stop') {
    clearInterval(intervalId)
    intervalId = null
  }
}
