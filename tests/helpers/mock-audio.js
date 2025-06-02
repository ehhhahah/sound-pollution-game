// Mock Audio for testing
class MockAudio {
  constructor() {
    this.paused = true
    this.currentTime = 0
    this.loop = false
    this.listeners = {}
    this._playPromise = Promise.resolve()
    this.audioContext = null
    this.source = null
    this.gainNode = null
  }

  play() {
    this.paused = false
    this._playPromise = new Promise((resolve) => {
      if (this.listeners.canplaythrough) {
        this.listeners.canplaythrough.forEach((cb) => cb())
      }
      resolve()
    })
    return this._playPromise
  }

  pause() {
    this.paused = true
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }
}

// Store original Audio constructor
const originalAudio = window.Audio

// Replace Audio constructor with MockAudio
window.Audio = MockAudio

// Mock AudioContext for testing
class MockAudioContext {
  constructor() {
    this.destination = {
      connect: () => {}
    }
  }

  createMediaElementSource(element) {
    return {
      connect: (node) => {
        if (node) {
          node.connect(this.destination)
        }
      }
    }
  }

  createGain() {
    return {
      connect: (node) => {
        if (node) {
          node.connect(this.destination)
        }
      },
      gain: { value: 1.0 }
    }
  }
}

// Replace AudioContext with MockAudioContext
window.AudioContext = MockAudioContext
window.webkitAudioContext = MockAudioContext
