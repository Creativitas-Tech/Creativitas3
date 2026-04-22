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
    let centerLane = document.getElementById('beatSurferCenterLane')
    let gridMount = document.getElementById('beatSurferGridMount')
    let statBarsHost = document.getElementById('beatSurferStatBars')

    const centerLaneCss =
      'position:relative;z-index:1;width:100%;max-width:min(1200px,calc(100vw - 32px));margin:0 auto;' +
      'box-sizing:border-box;padding:0 clamp(72px,10vw,120px);' +
      'display:flex;flex-direction:column;align-items:center;'
    const gridMountCss =
      'width:auto;max-width:100%;min-width:0;margin-left:auto;margin-right:auto;display:flex;justify-content:center;box-sizing:border-box;'

    if (!gridRow && canvasHost && canvasHost.parentNode) {
      gridRow = document.createElement('div')
      gridRow.id = 'beatSurferGridRow'
      gridRow.style.cssText =
        'position:relative;margin:12px 0;width:100%;max-width:100%;min-height:clamp(180px,32dvh,420px);'
      centerLane = document.createElement('div')
      centerLane.id = 'beatSurferCenterLane'
      centerLane.style.cssText = centerLaneCss

      if (gridMount && gridMount.parentNode) {
        gridMount.parentNode.insertBefore(gridRow, gridMount)
        gridMount.style.cssText = gridMountCss
        gridRow.appendChild(centerLane)
        centerLane.appendChild(gridMount)
      } else {
        gridMount = document.createElement('div')
        gridMount.id = 'beatSurferGridMount'
        gridMount.style.cssText = gridMountCss
        if (canvasHost.nextSibling) canvasHost.parentNode.insertBefore(gridRow, canvasHost.nextSibling)
        else canvasHost.parentNode.appendChild(gridRow)
        gridRow.appendChild(centerLane)
        centerLane.appendChild(gridMount)
      }

      statBarsHost = document.createElement('div')
      statBarsHost.id = 'beatSurferStatBars'
      statBarsHost.style.cssText =
        'position:absolute;inset:0;z-index:2;pointer-events:none;'
      gridRow.appendChild(statBarsHost)
    } else if (gridRow && !statBarsHost) {
      statBarsHost = document.createElement('div')
      statBarsHost.id = 'beatSurferStatBars'
      statBarsHost.style.cssText =
        'position:absolute;inset:0;z-index:2;pointer-events:none;'
      gridRow.appendChild(statBarsHost)
    }

    if (gridRow && !centerLane) {
      centerLane = document.createElement('div')
      centerLane.id = 'beatSurferCenterLane'
      centerLane.style.cssText = centerLaneCss
      if (gridMount && gridMount.parentNode === gridRow) {
        gridRow.insertBefore(centerLane, gridMount)
        centerLane.appendChild(gridMount)
      } else {
        gridRow.appendChild(centerLane)
      }
    }

    if (gridMount && centerLane && gridMount.parentNode !== centerLane) {
      centerLane.appendChild(gridMount)
    }

    if (gridMount) {
      gridMount.style.cssText = gridMountCss
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
