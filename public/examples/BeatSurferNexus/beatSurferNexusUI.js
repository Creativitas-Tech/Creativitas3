// BeatSurferNexus UI — NexusUI buttons + HTML status display
(() => {
  'use strict'

  const BUTTON_W = 80
  const BUTTON_H = 80
  const BUTTON_SPACING = 90
  const BUTTON_TOP = 80
  const BUTTON_LEFT = 20

  function createButtons({ Canvas, config, onPress, NexusButton }) {
    const container = Canvas || document.getElementById('Canvas')
    if (!container) return []

    const row = document.createElement('div')
    row.setAttribute('data-beatsurfernexus-row', '1')
    row.style.cssText =
      'position:absolute;left:' + BUTTON_LEFT + 'px;top:' + BUTTON_TOP + 'px;' +
      'display:flex;flex-direction:row;align-items:center;gap:10px;'
    container.appendChild(row)

    const buttons = []
    const colors = config.NOTE_COLORS || ['#2563eb', '#16a34a', '#ea580c', '#9333ea']
    for (let i = 0; i < 4; i++) {
      const btn = new NexusButton(0, 0, BUTTON_W, BUTTON_H)
      if (typeof btn.colorize === 'function') {
        btn.colorize('accent', colors[i])
        btn.colorize('fill', '#252530')
      }
      if (btn.elementContainer) {
        btn.elementContainer.style.left = ''
        btn.elementContainer.style.top = ''
        btn.elementContainer.style.position = 'relative'
        row.appendChild(btn.elementContainer)
        const label = document.createElement('div')
        label.setAttribute('data-beatsurfernexus-label', '1')
        label.textContent = String(i + 1)
        label.style.cssText =
          'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
          'pointer-events:none;font-size:32px;font-weight:bold;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);'
        btn.elementContainer.appendChild(label)
      }
      if (btn.resizeObserver) btn.resizeObserver.disconnect()
      btn.mapTo((v) => {
        if (!v) return
        try {
          onPress(i)
        } catch (err) {
          console.error('[BeatSurferNexus] button press error:', err)
          throw err
        }
      })
      buttons.push(btn)
    }
    return buttons
  }

  // Visual flash only via DOM overlay (circle, button color). Do NOT call button.turnOn/turnOff.
  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha != null ? alpha : 0.5) + ')'
  }

  function flashButton({ buttons, Canvas, config }, i, isOffTime) {
    if (!buttons || !buttons[i]) return
    const flashMs = isOffTime ? 220 : 100
    const overlay = document.createElement('div')
    overlay.setAttribute('data-beatsurfernexus-flash', '1')
    let rect = null
    const btn = buttons[i]
    if (btn.elementContainer && btn.elementContainer.getBoundingClientRect) {
      rect = btn.elementContainer.getBoundingClientRect()
    }
    if (!rect && Canvas) {
      let canvasEl = Canvas.querySelector ? Canvas.querySelector('canvas') : (Canvas.tagName === 'CANVAS' ? Canvas : null)
      if (!canvasEl && document.getElementById('Canvas')) {
        const c = document.getElementById('Canvas')
        canvasEl = c.tagName === 'CANVAS' ? c : (c.querySelector && c.querySelector('canvas')) || c.firstElementChild
      }
      if (canvasEl && canvasEl.getBoundingClientRect) rect = canvasEl.getBoundingClientRect()
    }
    const colors = (config && config.NOTE_COLORS) || ['#2563eb', '#16a34a', '#ea580c', '#9333ea']
    const buttonColor = colors[i] || '#2563eb'
    const bg = isOffTime ? 'rgba(255,50,50,0.5)' : hexToRgba(buttonColor, 0.55)
    const circle = 'border-radius:50%;'
    if (rect && rect.width > 0 && rect.height > 0) {
      overlay.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;background:' + bg + ';pointer-events:none;z-index:2147483646;' + circle
    } else {
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:' + bg + ';pointer-events:none;z-index:2147483646;'
    }
    if (document.body) document.body.appendChild(overlay)
    else document.documentElement.appendChild(overlay)
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay) }, flashMs)
  }

  function ensureDisplay({ Canvas, onPlayAgain }) {
    let el = document.getElementById('beatSurferNexusDisplay')
    if (!el) {
      el = document.createElement('div')
      el.id = 'beatSurferNexusDisplay'
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
      playAgainBtn.id = 'beatSurferNexusPlayAgain'
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

    let textSpan = document.getElementById('beatSurferNexusText')
    if (!textSpan) {
      textSpan = document.createElement('span')
      textSpan.id = 'beatSurferNexusText'
      el.insertBefore(textSpan, el.firstChild)
    }

    return { el, textSpan }
  }

  function updateDisplay({ state, config, util }) {
    const { Canvas, gameState, countInBeatsLeft, targetSequence, playerSequence, sequenceBeatsLeft, currentBPM, health, boring, onPlayAgain } = state
    const { textSpan } = ensureDisplay({ Canvas, onPlayAgain })

    const playAgainBtn = document.getElementById('beatSurferNexusPlayAgain')
    if (playAgainBtn) playAgainBtn.style.display = gameState === 'gameOver' ? 'inline-block' : 'none'

    if (gameState === 'countIn') {
      const colors = config.NOTE_COLORS || ['#2563eb', '#16a34a', '#ea580c', '#9333ea']
      const colorIndex = (4 - countInBeatsLeft) % 4
      const countColor = colors[colorIndex >= 0 ? colorIndex : 0]
      textSpan.innerHTML = '<span style="font-size:56px;font-weight:bold;color:' + countColor + ';line-height:1.2">' + countInBeatsLeft + '</span>'
      return
    }

    const colors = config.NOTE_COLORS || ['#2563eb', '#16a34a', '#ea580c', '#9333ea']
    const targetStr = targetSequence.length ? util.formatColoredSeq(targetSequence, colors) : '<span style="color:#888">-</span>'
    const youStr = playerSequence.slice(-config.TARGET_LEN).length ? util.formatColoredSeq(playerSequence.slice(-config.TARGET_LEN), colors) : '<span style="color:#888">-</span>'
    const keysLegend = [0, 1, 2, 3]
      .map(i => '<span style="color:' + colors[i] + ';font-weight:bold;font-size:1.05em">' + (i + 1) + '</span>')
      .join(' ')

    const hintHtml = playerSequence.length === 0
      ? '<br><span style="font-size:12px;color:#666;font-style:italic">Play keys 1–4 on the beat.</span>'
      : ''

    const separator = ' <span style="color:#555;opacity:0.6;margin:0 4px">|</span> '

    const gameOverHtml = gameState === 'gameOver'
      ? '<br><br><b>Game over!</b> '
      : ''

    textSpan.innerHTML =
      '<span style="font-size:13px">Keys: ' + keysLegend + '</span>' +
      hintHtml + '<br>' +
      '<b>Target:</b> [' + targetStr + '] &nbsp; <b>You:</b> [' + youStr + ']' +
      separator +
      '<b>Beats left:</b> ' + sequenceBeatsLeft + ' &nbsp; <b>BPM:</b> ' + currentBPM + ' &nbsp; ' +
      '<span style="color:#c62828;font-weight:bold"><b>Health:</b> ' + health + '</span> &nbsp; ' +
      '<span style="color:#757575;font-weight:bold"><b>Boring:</b> ' + boring + '</span>' +
      gameOverHtml
  }

  window.BeatSurferNexusUI = { createButtons, flashButton, updateDisplay }
})()
