/**
 * BeatSurferUI — DOM factory per game instance. Element ids use prefix `beatSurfer` + instanceId
 * (e.g. beatSurferP1GridRow). Layout: LeftCol = p5 mount + Nexus row; StatBars = Health/Boring.
 * Exposes createGridButtons, flashButton, updateDisplay (wired by BeatSurferGame).
 */
(() => {
  'use strict'

  const DEFAULT_NOTE_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#9333ea',
    '#dc2626', '#0891b2', '#ca8a04',
  ]

  /** Used for countdown palette tints. */
  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha != null ? alpha : 0.5) + ')'
  }

  function noteColors(config) {
    return config.NOTE_COLORS || DEFAULT_NOTE_COLORS
  }

  /** HTML fragment for count-in column (number + label). */
  function formatCountdownColumn(shown, countColor) {
    return (
      '<div style="font-size:12px;color:#9ca3af;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px">Countdown</div>' +
      '<span style="font-size:56px;font-weight:bold;color:' + countColor + ';line-height:1.1">' + shown + '</span>'
    )
  }

  const NUM_GRID_BUTTONS = 7
  const DEFAULT_NEXUS_BUTTON_W = 88
  const DEFAULT_NEXUS_BUTTON_H = 80

  function createBeatSurferUI(instanceId) {
    const pfx = 'beatSurfer' + (instanceId || '')

    /** Tint on correct/wrong feedback: full viewport in single-player; one split half when Canvas is inside .player-pane. */
    function flashButton({ buttons, Canvas, config }, i, feedback) {
      const flashMs = feedback === 'correct' ? 100 : 150
      const bg = feedback === 'correct'
        ? 'rgba(34,197,94,0.35)'
        : 'rgba(239,68,68,0.35)'
      const overlay = document.createElement('div')
      const pane = Canvas && typeof Canvas.closest === 'function'
        ? Canvas.closest('.player-pane')
        : null
      if (pane) {
        overlay.style.cssText =
          'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;' +
          'background:' + bg + ';pointer-events:none;z-index:2147483646;'
        pane.appendChild(overlay)
      } else {
        overlay.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;' +
          'background:' + bg + ';pointer-events:none;z-index:2147483646;'
        document.body.appendChild(overlay)
      }
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      }, flashMs)
    }

    /** HUD text + Play again; inserted before the instance canvas host. */
    function ensureDisplay({ Canvas, onPlayAgain }) {
      let el = document.getElementById(pfx + 'Display')
      if (!el) {
        el = document.createElement('div')
        el.id = pfx + 'Display'
        el.style.cssText =
          'margin: 10px 0; font-family: monospace; font-size: 14px; width: 100%; max-width: 100%; box-sizing: border-box;'
        const container = (Canvas && Canvas.parentNode) ? Canvas.parentNode : document.getElementById('Canvas')
        if (container) {
          if (Canvas && container.contains && container.contains(Canvas)) container.insertBefore(el, Canvas)
          else container.appendChild(el)
        } else if (document.body) {
          document.body.appendChild(el)
        } else {
          document.documentElement.appendChild(el)
        }

        const playAgainBtn = document.createElement('button')
        playAgainBtn.id = pfx + 'PlayAgain'
        playAgainBtn.textContent = 'Play again'
        playAgainBtn.style.cssText =
          'margin-left: 8px; padding: 10px 20px; cursor: pointer; display: none;' +
          'border: none; border-radius: 10px; font-weight: bold; font-size: 14px;' +
          'background: #2563eb; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);' +
          'transition: transform 0.1s, box-shadow 0.1s;'
        playAgainBtn.onmouseover = function () { this.style.background = '#1d4ed8'; this.style.transform = 'scale(1.02)'; this.style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)'; }
        playAgainBtn.onmouseout = function () { this.style.background = '#2563eb'; this.style.transform = 'scale(1)'; this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'; }
        playAgainBtn.onclick = onPlayAgain
        el.appendChild(playAgainBtn)
      }

      let textSpan = document.getElementById(pfx + 'Text')
      if (!textSpan) {
        textSpan = document.createElement('span')
        textSpan.id = pfx + 'Text'
        el.insertBefore(textSpan, el.firstChild)
      }

      return { el, textSpan }
    }

    /** Corner overlay for phrase hints (hidden in current flow via syncPhrasePreview). */
    function ensurePhrasePreview(Canvas) {
      let p = document.getElementById(pfx + 'PhrasePreview')
      const cornerStyle =
        'position:absolute;top:8px;right:12px;z-index:50;text-align:right;font-family:monospace;font-size:15px;' +
        'line-height:1.3;pointer-events:none;max-width:38%;text-shadow:0 1px 2px rgba(0,0,0,0.35);'
      if (p) {
        p.style.cssText = cornerStyle
        return p
      }
      p = document.createElement('div')
      p.id = pfx + 'PhrasePreview'
      const host = (Canvas && Canvas.parentNode) ? Canvas.parentNode : document.getElementById('Canvas')
      if (!host) return null
      if (host.style && (!host.style.position || host.style.position === 'static')) {
        try {
          if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative'
        } catch (e) {
          host.style.position = 'relative'
        }
      }
      p.style.cssText = cornerStyle
      host.appendChild(p)
      return p
    }

    /** Clears phrase preview overlay. */
    function syncPhrasePreview({ Canvas }) {
      const p = ensurePhrasePreview(Canvas)
      if (!p) return
      p.innerHTML = ''
      p.style.display = 'none'
    }

    /** Big countdown during countIn; lives above LeftCol or before GridRow. */
    function ensureCountdownEl() {
      let el = document.getElementById(pfx + 'Countdown')
      if (el) return el
      el = document.createElement('div')
      el.id = pfx + 'Countdown'
      el.style.cssText =
        'font-family:monospace;text-align:left;margin-bottom:6px;display:none;'
      const leftCol = document.getElementById(pfx + 'LeftCol')
      if (leftCol) {
        leftCol.insertBefore(el, leftCol.firstChild)
      } else {
        const gridRow = document.getElementById(pfx + 'GridRow')
        if (gridRow && gridRow.parentNode) {
          gridRow.parentNode.insertBefore(el, gridRow)
        }
      }
      return el
    }

    /** Match Health/Boring columns to piano-roll canvas top/height (host is #StatBars over #Playfield). */
    function syncStatBarsLayoutToGrid() {
      const host = document.getElementById(pfx + 'StatBars')
      const mount = document.getElementById(pfx + 'GridMount')
      if (!host || !mount) return
      const canvas = mount.querySelector('canvas')
      if (!canvas || canvas.offsetHeight <= 0) return
      const hostRect = host.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()
      const topPx = Math.round(canvasRect.top - hostRect.top)
      const hPx = Math.round(canvasRect.height)
      const cols = host.querySelectorAll('[data-bsnp-stat-col]')
      for (let ci = 0; ci < cols.length; ci++) {
        const col = cols[ci]
        col.style.top = topPx + 'px'
        col.style.height = hPx + 'px'
        col.style.bottom = 'auto'
        col.style.justifyContent = 'flex-start'
      }
      const tracks = host.querySelectorAll('[data-bsnp-stat-track]')
      for (let ti = 0; ti < tracks.length; ti++) {
        tracks[ti].style.flex = '0 0 auto'
        tracks[ti].style.minHeight = '0'
        tracks[ti].style.height = '100%'
      }
    }

    /** Builds LeftCol + NexusButton strip; pads reparent from global #Canvas into GridButtons. */
    function createGridButtons({ gridRow, config, onGridChange, NexusButton }) {
      if (!gridRow) return []

      const gridMount = document.getElementById(pfx + 'GridMount')
      if (!gridMount) return []

      const mountParent = gridMount.parentNode || gridRow

      gridRow.style.width = '100%'
      gridRow.style.maxWidth = '100%'
      gridRow.style.boxSizing = 'border-box'
      gridRow.style.minHeight = 'clamp(180px,32dvh,420px)'

      let leftCol = document.getElementById(pfx + 'LeftCol')
      if (!leftCol) {
        leftCol = document.createElement('div')
        leftCol.id = pfx + 'LeftCol'
        leftCol.style.cssText =
          'display:flex;flex-direction:column;align-items:center;min-width:0;width:100%;max-width:100%;margin:0;gap:6px;box-sizing:border-box;'
        mountParent.insertBefore(leftCol, gridMount)
        leftCol.appendChild(gridMount)
      } else {
        leftCol.style.cssText =
          'display:flex;flex-direction:column;align-items:center;min-width:0;width:100%;max-width:100%;margin:0;gap:6px;box-sizing:border-box;'
      }

      /** Wraps only the sequence grid; StatBars overlay uses this box so meters align with the canvas width. */
      let playfield = document.getElementById(pfx + 'Playfield')
      if (!playfield) {
        playfield = document.createElement('div')
        playfield.id = pfx + 'Playfield'
        playfield.style.cssText =
          'position:relative;width:100%;max-width:100%;align-self:stretch;box-sizing:border-box;'
        if (gridMount.parentNode === leftCol) {
          leftCol.insertBefore(playfield, gridMount)
        } else {
          leftCol.insertBefore(playfield, leftCol.firstChild)
        }
        playfield.appendChild(gridMount)
      } else if (gridMount.parentNode !== playfield) {
        playfield.insertBefore(gridMount, playfield.firstChild)
      }

      let statHost = document.getElementById(pfx + 'StatBars')
      if (!statHost) {
        statHost = document.createElement('div')
        statHost.id = pfx + 'StatBars'
        playfield.appendChild(statHost)
      } else if (statHost.parentNode !== playfield) {
        playfield.appendChild(statHost)
      }

      let wrap = document.getElementById(pfx + 'GridButtons')
      if (wrap) wrap.parentNode.removeChild(wrap)

      wrap = document.createElement('div')
      wrap.id = pfx + 'GridButtons'
      wrap.style.cssText =
        'display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:flex-start;gap:0;' +
        'width:100%;max-width:100%;margin:0 auto;flex-shrink:0;box-sizing:border-box;'
      leftCol.appendChild(wrap)

      if (leftCol._bsStripResizeObserver) {
        try {
          leftCol._bsStripResizeObserver.disconnect()
        } catch (e) { /* ignore */ }
        leftCol._bsStripResizeObserver = null
        const prevMount = document.getElementById(pfx + 'GridMount')
        const prevCv = prevMount && prevMount.querySelector('canvas')
        if (prevCv) prevCv.removeAttribute('data-bs-strip-ro')
      }

      function syncGridButtonStripToCanvas() {
        const mount = document.getElementById(pfx + 'GridMount')
        const strip = document.getElementById(pfx + 'GridButtons')
        if (!mount || !strip) return
        const canvas = mount.querySelector('canvas')
        if (canvas && leftCol._bsStripResizeObserver && !canvas.getAttribute('data-bs-strip-ro')) {
          canvas.setAttribute('data-bs-strip-ro', '1')
          try {
            leftCol._bsStripResizeObserver.observe(canvas)
          } catch (e) { /* ignore */ }
        }
        const cw = canvas && canvas.offsetWidth > 0 ? canvas.offsetWidth : 0
        const nPads = (config && config.GRID_BUTTON_COUNT) || NUM_GRID_BUTTONS
        const padW = (config && config.NEXUS_BUTTON_WIDTH) || DEFAULT_NEXUS_BUTTON_W
        if (cw > 0 && nPads > 0 && padW > 0) {
          strip.style.width = cw + 'px'
          strip.style.maxWidth = cw + 'px'
          strip.style.marginLeft = 'auto'
          strip.style.marginRight = 'auto'
          const totalPad = nPads * padW
          const gapPx = nPads > 1 ? Math.max(0, Math.floor((cw - totalPad) / (nPads - 1))) : 0
          strip.style.gap = gapPx + 'px'
        } else {
          strip.style.width = ''
          strip.style.maxWidth = ''
          strip.style.marginLeft = 'auto'
          strip.style.marginRight = 'auto'
          strip.style.gap = '0'
        }
      }

      if (gridMount && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(function () {
          syncGridButtonStripToCanvas()
          syncStatBarsLayoutToGrid()
        })
        ro.observe(gridMount)
        leftCol._bsStripResizeObserver = ro
      }

      const count = (config && config.GRID_BUTTON_COUNT) || NUM_GRID_BUTTONS
      const nx = (config && config.NEXUS_BUTTON_WIDTH) || DEFAULT_NEXUS_BUTTON_W
      const ny = (config && config.NEXUS_BUTTON_HEIGHT) || DEFAULT_NEXUS_BUTTON_H
      const buttons = []
      const colors = config.NOTE_COLORS || DEFAULT_NOTE_COLORS
      for (let i = 0; i < count; i++) {
        const btn = new NexusButton(0, 0, nx, ny)
        if (typeof btn.colorize === 'function') {
          btn.colorize('accent', colors[i] || DEFAULT_NOTE_COLORS[i % DEFAULT_NOTE_COLORS.length])
          btn.colorize('fill', '#1a1a24')
        }
        if (btn.elementContainer) {
          btn.elementContainer.style.left = ''
          btn.elementContainer.style.top = ''
          btn.elementContainer.style.position = 'relative'
          btn.elementContainer.style.flex = '0 0 auto'
          btn.elementContainer.style.width = nx + 'px'
          btn.elementContainer.style.minWidth = nx + 'px'
          btn.elementContainer.style.maxWidth = nx + 'px'
          btn.elementContainer.style.display = 'flex'
          btn.elementContainer.style.alignItems = 'center'
          btn.elementContainer.style.justifyContent = 'center'
          wrap.appendChild(btn.elementContainer)
          const label = document.createElement('div')
          label.setAttribute('data-bsnp-grid-label', '1')
          label.textContent = String(i + 1)
          label.style.cssText =
            'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;padding:0;' +
            'pointer-events:none;z-index:1;white-space:nowrap;' +
            'font-size:clamp(22px,3.4vw,28px);font-weight:bold;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);line-height:1;'
          btn.elementContainer.appendChild(label)
        }
        if (btn.resizeObserver) btn.resizeObserver.disconnect()
        const noteIndex = i
        if (btn.element && typeof btn.element.on === 'function') {
          btn.element.on('change', (v) => {
            try {
              onGridChange(noteIndex, v)
            } catch (err) {
              console.error('[BeatSurfer] grid button change error:', err)
              throw err
            }
          })
        } else if (typeof btn.mapTo === 'function') {
          btn.mapTo((v) => {
            if (!v) return
            try {
              onGridChange(noteIndex, { state: true })
            } catch (err) {
              console.error('[BeatSurfer] grid button press error:', err)
              throw err
            }
          })
        }
        buttons.push(btn)
      }

      function scheduleStripSync() {
        syncGridButtonStripToCanvas()
        syncStatBarsLayoutToGrid()
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function () {
            syncGridButtonStripToCanvas()
            syncStatBarsLayoutToGrid()
          })
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              syncGridButtonStripToCanvas()
              syncStatBarsLayoutToGrid()
            })
          })
        } else {
          setTimeout(function () {
            syncGridButtonStripToCanvas()
            syncStatBarsLayoutToGrid()
          }, 0)
          setTimeout(function () {
            syncGridButtonStripToCanvas()
            syncStatBarsLayoutToGrid()
          }, 120)
        }
      }
      scheduleStripSync()

      return buttons
    }

    /** One vertical meter: label + track; fill height is v% from syncStatBars. */
    function buildOneStatBar(title, idBase, fillColor, textColor) {
      const col = document.createElement('div')
      col.setAttribute('data-bsnp-stat-col', idBase)
      col.style.cssText =
        'position:relative;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;' +
        'width:clamp(69px,8vw,96px);min-width:69px;box-sizing:border-box;'
      const lab = document.createElement('div')
      lab.textContent = title
      lab.style.cssText =
        'position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:6px;white-space:nowrap;' +
        'font-size:clamp(9px, 1.8vw, 11px);font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.03em;' +
        'text-align:center;line-height:1.1;'
      const track = document.createElement('div')
      track.setAttribute('data-bsnp-stat-track', idBase)
      track.style.cssText =
        'position:relative;flex:0 0 auto;width:100%;max-width:100%;height:100%;min-height:0;' +
        'background:#1a1a1f;border:2px solid #3d3d48;border-radius:8px;overflow:hidden;box-sizing:border-box;'
      const fill = document.createElement('div')
      fill.id = pfx + idBase + 'Fill'
      fill.style.cssText =
        'position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;' +
        'box-sizing:border-box;background:' + fillColor + ';transition:height 0.14s ease-out,min-height 0.14s ease-out;'
      const val = document.createElement('span')
      val.id = pfx + idBase + 'Val'
      val.style.cssText =
        'font-size:13px;font-weight:800;color:' + textColor + ';text-shadow:0 0 4px rgba(0,0,0,0.9),0 1px 2px #000;' +
        'pointer-events:none;line-height:1;'
      fill.appendChild(val)
      const zero = document.createElement('div')
      zero.id = pfx + idBase + 'Zero'
      zero.style.cssText =
        'display:none;position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:12px;font-weight:800;' +
        'color:#6b7280;text-shadow:0 1px 2px #000;pointer-events:none;'
      track.appendChild(fill)
      track.appendChild(zero)
      col.appendChild(lab)
      col.appendChild(track)
      return col
    }

    /** One-time build into #StatBars (guarded by data-bsnp-statbars-built). */
    function ensureStatBars() {
      const host = document.getElementById(pfx + 'StatBars')
      if (!host) return null
      if (host.getAttribute('data-bsnp-statbars-built')) return host
      host.setAttribute('data-bsnp-statbars-built', '1')
      host.style.cssText =
        'position:absolute;inset:0;z-index:2;pointer-events:none;'
      host.innerHTML = ''
      const healthCol = buildOneStatBar('Health', 'Health', 'linear-gradient(180deg,#b71c1c 0%,#e53935 100%)', '#ffebee')
      healthCol.style.position = 'absolute'
      healthCol.style.left = 'clamp(8px,2vw,24px)'
      healthCol.style.zIndex = '2'
      const boringCol = buildOneStatBar('Boring', 'Boring', 'linear-gradient(180deg,#5c5c5c 0%,#9e9e9e 100%)', '#fafafa')
      boringCol.style.position = 'absolute'
      boringCol.style.right = 'clamp(8px,2vw,24px)'
      boringCol.style.zIndex = '2'
      host.appendChild(healthCol)
      host.appendChild(boringCol)
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(syncStatBarsLayoutToGrid)
      } else {
        setTimeout(syncStatBarsLayoutToGrid, 0)
      }
      return host
    }

    /** Maps 0–100 health/boring to fill height % on each track. */
    function syncStatBars(health, boring) {
      ensureStatBars()
      const max = 100
      const h = Math.max(0, Math.min(max, Math.round(Number(health))))
      const b = Math.max(0, Math.min(max, Math.round(Number(boring))))

      function syncOne(idBase, v) {
        const fill = document.getElementById(pfx + idBase + 'Fill')
        const valEl = document.getElementById(pfx + idBase + 'Val')
        const zeroEl = document.getElementById(pfx + idBase + 'Zero')
        if (!fill || !valEl || !zeroEl) return
        valEl.textContent = String(v)
        if (v <= 0) {
          fill.style.height = '0%'
          fill.style.minHeight = '0'
          fill.style.visibility = 'hidden'
          zeroEl.style.display = 'block'
          zeroEl.textContent = '0'
        } else {
          fill.style.visibility = 'visible'
          fill.style.height = v + '%'
          fill.style.minHeight = v > 0 && v < 12 ? '26px' : ''
          zeroEl.style.display = 'none'
        }
      }

      syncOne('Health', h)
      syncOne('Boring', b)
      syncStatBarsLayoutToGrid()
    }

    /** countIn: countdown + stat bars; otherwise clears countdown, updates stats. */
    function updateDisplay({ state, config, util }) {
      const {
        Canvas, gameState, countInBeatsLeft, targetSequence, playerSequence,
        currentBPM, health, boring, onPlayAgain,
      } = state
      const { textSpan } = ensureDisplay({ Canvas, onPlayAgain })
      textSpan.style.display = 'block'
      textSpan.style.width = '100%'

      const playAgainBtn = document.getElementById(pfx + 'PlayAgain')
      if (playAgainBtn) playAgainBtn.style.display = gameState === 'gameOver' ? 'inline-block' : 'none'

      const countdownEl = ensureCountdownEl()

      if (gameState === 'countIn') {
        const colors = noteColors(config)
        const shown = countInBeatsLeft > 0 ? Math.ceil(countInBeatsLeft / 2) : 1
        const nPal = colors.length || 1
        const colorIndex = ((4 - shown) % nPal + nPal) % nPal
        const countColor = colors[colorIndex] || colors[0]
        countdownEl.innerHTML = formatCountdownColumn(shown, countColor)
        countdownEl.style.display = 'block'
        textSpan.innerHTML = ''
        syncPhrasePreview({ Canvas })
        syncStatBars(health, boring)
        return
      }

      countdownEl.style.display = 'none'
      textSpan.innerHTML = ''
      textSpan.style.width = ''

      syncPhrasePreview({ Canvas })
      syncStatBars(health, boring)
    }

    return { createGridButtons, flashButton, updateDisplay, prefix: pfx }
  }

  window.createBeatSurferUI = createBeatSurferUI

  // Backward compat: default singleton with empty instanceId
  window.BeatSurferUI = createBeatSurferUI('')
})()
