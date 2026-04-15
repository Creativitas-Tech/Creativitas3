/**
 * Embedded entry (Creativitas host): sequential script load, then runLoaded() for a single
 * instance (empty instanceId). For split-screen two-player, use BeatSurfer.html userCode instead.
 */
(async () => {
  'use strict'

  if (typeof window.loadCode !== 'function') {
    throw new Error('BeatSurferGame: window.loadCode is not available.')
  }

  const base = 'examples/BeatSurferGame/'
  await window.loadCode(base + 'beatSurferConfig.js', true)
  await window.loadCode(base + 'beatSurferUtil.js', true)
  await window.loadCode(base + 'beatSurferUI.js', true)
  await window.loadCode(base + 'beatSurferSequenceGrid.js', true)
  await window.loadCode(base + 'BeatSurferGame.js', true)

  /** Inserts grid row next to #Canvas, builds UI + sequence grid + BeatSurferGame, calls init(). */
  function runLoaded() {
    const canvasHost = typeof Canvas !== 'undefined' ? Canvas : document.getElementById('Canvas')
    let gridRow = document.getElementById('beatSurferGridRow')
    let gridMount = document.getElementById('beatSurferGridMount')
    let statBarsHost = document.getElementById('beatSurferStatBars')

    if (!gridRow && canvasHost && canvasHost.parentNode) {
      gridRow = document.createElement('div')
      gridRow.id = 'beatSurferGridRow'
      gridRow.style.cssText =
        'display:flex;flex-direction:row;align-items:stretch;gap:14px;margin:12px 0;width:100%;max-width:680px;'

      if (gridMount && gridMount.parentNode) {
        gridMount.parentNode.insertBefore(gridRow, gridMount)
        gridMount.style.cssText = 'flex:1 1 auto;min-width:0;margin:0;max-width:520px;'
        gridRow.appendChild(gridMount)
      } else {
        gridMount = document.createElement('div')
        gridMount.id = 'beatSurferGridMount'
        gridMount.style.cssText = 'flex:1 1 auto;min-width:0;margin:0;max-width:520px;'
        if (canvasHost.nextSibling) canvasHost.parentNode.insertBefore(gridRow, canvasHost.nextSibling)
        else canvasHost.parentNode.appendChild(gridRow)
        gridRow.appendChild(gridMount)
      }

      statBarsHost = document.createElement('div')
      statBarsHost.id = 'beatSurferStatBars'
      statBarsHost.style.cssText =
        'flex:0 0 auto;display:flex;flex-direction:row;align-items:flex-end;gap:12px;padding-bottom:2px;'
      gridRow.appendChild(statBarsHost)
    } else if (gridRow && !statBarsHost) {
      statBarsHost = document.createElement('div')
      statBarsHost.id = 'beatSurferStatBars'
      statBarsHost.style.cssText =
        'flex:0 0 auto;display:flex;flex-direction:row;align-items:flex-end;gap:12px;padding-bottom:2px;'
      gridRow.appendChild(statBarsHost)
    }

    const sequenceGrid = typeof window.createBeatSurferSequenceGrid === 'function'
      ? window.createBeatSurferSequenceGrid({
          config: window.BeatSurferConfig,
          container: gridMount,
        })
      : null

    window.beatSurferGameInstance = new window.BeatSurferGame({
      Canvas,
      Tone,
      Theory,
      DrumSampler,
      Polyphony,
      Daisy,
      Reverb,
      NexusButton,
      config: window.BeatSurferConfig,
      util: window.BeatSurferUtil,
      ui: window.BeatSurferUI,
      sequenceGrid,
    })

    window.beatSurferGameInstance.init()

    window.startGame = () => window.beatSurferGameInstance.start()
    window.stopGame = () => window.beatSurferGameInstance.stop('manual')
  }

  runLoaded()
})().catch((e) => {
  console.error('BeatSurferGame loader failed:', e)
})
