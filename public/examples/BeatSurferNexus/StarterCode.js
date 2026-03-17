// BeatSurferNexus loader — runs at /BeatSurferNexus
// Loads Nexus UI modules and starts the game. Original Beat Surfer stays at /BeatSurfer.

(async () => {
  'use strict'

  if (typeof window.loadCode !== 'function') {
    throw new Error('BeatSurferNexus loader: window.loadCode is not available.')
  }

  await window.loadCode('examples/BeatSurferNexus/beatSurferNexusConfig.js', true)
  await window.loadCode('examples/BeatSurferNexus/beatSurferNexusUtil.js', true)
  await window.loadCode('examples/BeatSurferNexus/beatSurferNexusUI.js', true)
  await window.loadCode('examples/BeatSurferNexus/BeatSurferNexusGame.js', true)

  window.beatSurferNexus = new window.BeatSurferNexusGame({
    Canvas,
    Tone,
    Theory,
    DrumSampler,
    Polyphony,
    Daisy,
    Reverb,
    NexusButton,
    config: window.BeatSurferNexusConfig,
    util: window.BeatSurferNexusUtil,
    ui: window.BeatSurferNexusUI,
  })

  window.beatSurferNexus.init()

  window.startGame = () => window.beatSurferNexus.start()
  window.stopGame = () => window.beatSurferNexus.stop('manual')
})().catch((e) => {
  console.error('BeatSurferNexus loader failed:', e)
})
