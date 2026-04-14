/**
 * BeatSurferUI — Instance-based UI factory.
 * Call createBeatSurferUI(instanceId) to get an independent
 * UI object whose DOM elements are scoped by instanceId prefix.
 */
(() => {
  'use strict'

  const DEFAULT_NOTE_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#9333ea',
    '#dc2626', '#0891b2', '#ca8a04', '#db2777',
  ]

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

  function formatCountdownColumn(shown, countColor) {
    return (
      '<div style="font-size:12px;color:#9ca3af;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px">Countdown</div>' +
      '<span style="font-size:56px;font-weight:bold;color:' + countColor + ';line-height:1.1">' + shown + '</span>'
    )
  }

  const NUM_GRID_BUTTONS = 6
  const GRID_BUTTON_H = 64
  const STAT_TRACK_PX = 248

  function createBeatSurferUI(instanceId) {
    const pfx = 'beatSurfer' + (instanceId || '')

    function flashButton({ buttons, Canvas, config }, i, feedback) {
      const flashMs = feedback === 'correct' ? 100 : 150
      const bg = feedback === 'correct'
        ? 'rgba(34,197,94,0.35)'
        : 'rgba(239,68,68,0.35)'
      const overlay = document.createElement('div')
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:' + bg + ';pointer-events:none;z-index:2147483646;'
      document.body.appendChild(overlay)
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      }, flashMs)
    }

    function ensureDisplay({ Canvas, onPlayAgain }) {
      let el = document.getElementById(pfx + 'Display')
      if (!el) {
        el = document.createElement('div')
        el.id = pfx + 'Display'
        el.style.cssText = 'margin: 10px 0; font-family: monospace; font-size: 14px;'
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

    function syncPhrasePreview({ Canvas }) {
      const p = ensurePhrasePreview(Canvas)
      if (!p) return
      p.innerHTML = ''
      p.style.display = 'none'
    }

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

    function createGridButtons({ gridRow, config, onPress, NexusButton }) {
      if (!gridRow) return []

      const gridMount = document.getElementById(pfx + 'GridMount')
      if (!gridMount) return []

      gridRow.style.alignItems = 'flex-end'

      let leftCol = document.getElementById(pfx + 'LeftCol')
      if (!leftCol) {
        leftCol = document.createElement('div')
        leftCol.id = pfx + 'LeftCol'
        leftCol.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;min-width:0;max-width:520px;gap:6px;'
        gridRow.insertBefore(leftCol, gridMount)
        leftCol.appendChild(gridMount)
      }

      let wrap = document.getElementById(pfx + 'GridButtons')
      if (wrap) wrap.parentNode.removeChild(wrap)

      wrap = document.createElement('div')
      wrap.id = pfx + 'GridButtons'
      wrap.style.cssText =
        'display:flex;flex-direction:row;align-items:stretch;gap:6px;width:100%;box-sizing:border-box;'
      leftCol.appendChild(wrap)

      const count = (config && config.GRID_BUTTON_COUNT) || NUM_GRID_BUTTONS
      const buttons = []
      const colors = config.NOTE_COLORS || DEFAULT_NOTE_COLORS
      for (let i = 0; i < count; i++) {
        const btn = new NexusButton(0, 0, 80, GRID_BUTTON_H)
        if (typeof btn.colorize === 'function') {
          btn.colorize('accent', colors[i] || DEFAULT_NOTE_COLORS[i % DEFAULT_NOTE_COLORS.length])
          btn.colorize('fill', '#1a1a24')
        }
        if (btn.elementContainer) {
          btn.elementContainer.style.left = ''
          btn.elementContainer.style.top = ''
          btn.elementContainer.style.position = 'relative'
          btn.elementContainer.style.flex = '1 1 0'
          btn.elementContainer.style.minWidth = '0'
          wrap.appendChild(btn.elementContainer)
          const label = document.createElement('div')
          label.setAttribute('data-bsnp-grid-label', '1')
          label.textContent = String(i + 1)
          label.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
            'pointer-events:none;font-size:26px;font-weight:bold;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);line-height:1;'
          btn.elementContainer.appendChild(label)
        }
        if (btn.resizeObserver) btn.resizeObserver.disconnect()
        const noteIndex = i
        btn.mapTo((v) => {
          if (!v) return
          try {
            onPress(noteIndex)
          } catch (err) {
            console.error('[BeatSurfer] grid button press error:', err)
            throw err
          }
        })
        buttons.push(btn)
      }
      return buttons
    }

    function buildOneStatBar(title, idBase, fillColor, textColor) {
      const col = document.createElement('div')
      col.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:48px;'
      const lab = document.createElement('div')
      lab.textContent = title
      lab.style.cssText =
        'font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:6px;' +
        'text-align:center;line-height:1.1;max-width:48px;'
      const track = document.createElement('div')
      track.setAttribute('data-bsnp-stat-track', idBase)
      track.style.cssText =
        'position:relative;width:42px;height:' + STAT_TRACK_PX + 'px;background:#1a1a1f;border:2px solid #3d3d48;border-radius:8px;' +
        'overflow:hidden;box-sizing:border-box;'
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

    function ensureStatBars() {
      const host = document.getElementById(pfx + 'StatBars')
      if (!host) return null
      if (host.getAttribute('data-bsnp-statbars-built')) return host
      host.setAttribute('data-bsnp-statbars-built', '1')
      host.innerHTML = ''
      host.appendChild(buildOneStatBar('Health', 'Health', 'linear-gradient(180deg,#b71c1c 0%,#e53935 100%)', '#ffebee'))
      host.appendChild(buildOneStatBar('Boring', 'Boring', 'linear-gradient(180deg,#5c5c5c 0%,#9e9e9e 100%)', '#fafafa'))
      return host
    }

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
    }

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
