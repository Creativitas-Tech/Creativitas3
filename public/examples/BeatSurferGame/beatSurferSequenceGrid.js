/**
 * Piano-roll grid: scroll driven by laneEighthGlobal (continuous across phrases).
 * Game passes eighthIndexInPhrase for playhead; target vs next phrase for lookahead.
 */
(() => {
  'use strict'

  const SCROLL_LERP = 0.18

  function createSequenceGrid({ config, container }) {
    const rows = config.GRID_ROWS
    const cols = config.GRID_COLS
    const rgb = config.NOTE_COLORS_RGB || []

    const view = {
      targetSequence: [],
      nextTargetSequence: [],
      eighthIndexInPhrase: 0,
      laneEighthGlobal: 0,
      phraseEighths: 16,
      lapEighths: 8,
      gameState: 'idle',
      scrollX: 0,
    }

    if (!container || typeof p5 === 'undefined') {
      return {
        sync() {},
        remove() {},
      }
    }

    function sequenceForGlobalColumn(c, phraseEighths, currentPhraseIdx) {
      const p = Math.floor(c / phraseEighths)
      if (p === currentPhraseIdx) return view.targetSequence
      if (p === currentPhraseIdx + 1) return view.nextTargetSequence
      return null
    }

    const sketch = (gui) => {
      gui.setup = () => {
        const w = Math.max(320, container.clientWidth || 400)
        const h = Math.min(280, Math.round((w / cols) * (rows / cols) * 1.2))
        gui.createCanvas(w, h).parent(container)
      }

      gui.draw = () => {
        gui.background(20)
        const colW = gui.width / cols
        const rowH = gui.height / rows
        const playing = view.gameState === 'playing'
        const phraseEighths = Math.max(1, view.phraseEighths || 16)
        const lapEighths = Math.max(2, view.lapEighths || 8)
        const lane = Math.max(0, view.laneEighthGlobal)
        const eighth = Math.max(0, view.eighthIndexInPhrase)
        const currentPhraseIdx = Math.floor(lane / phraseEighths)

        if (!playing) {
          view.scrollX = 0
        } else {
          const targetScrollX = lane * colW
          view.scrollX += (targetScrollX - view.scrollX) * SCROLL_LERP
        }

        const scrollX = view.scrollX
        const cStart = Math.max(0, Math.floor(scrollX / colW) - 1)
        const cEnd = cStart + cols + phraseEighths + 2

        gui.push()
        gui.translate(-scrollX, 0)

        for (let c = cStart; c <= cEnd; c++) {
          const seq = sequenceForGlobalColumn(c, phraseEighths, currentPhraseIdx)
          const localE = ((c % phraseEighths) + phraseEighths) % phraseEighths
          const lapLocal = localE % lapEighths
          const isDownbeat = lapLocal % 2 === 0
          const stepInLap = Math.floor(lapLocal / 2)
          let targetRow = null
          if (seq && seq.length > 0 && isDownbeat) {
            targetRow = seq[stepInLap % seq.length]
          }

          for (let r = 0; r < rows; r++) {
            const noteForRow = rows - 1 - r
            const x = c * colW
            const y = r * rowH

            const isTargetHere = isDownbeat && targetRow === noteForRow

            let fillRgb = noteForRow % 2 === 0 ? [48, 48, 54] : [52, 52, 58]

            if (isTargetHere) {
              const col = rgb[noteForRow]
              fillRgb = col ? col : [80, 80, 90]
            }

            gui.fill(fillRgb[0], fillRgb[1], fillRgb[2])
            gui.stroke(120, 120, 130)
            gui.rect(x, y, colW - 1, rowH - 1)
          }
        }

        gui.pop()

        if (playing && eighth >= 0 && eighth < phraseEighths) {
          gui.noStroke()
          gui.fill(255, 255, 0, 70)
          gui.rect(0, 0, colW, gui.height)
        }
      }

      gui.windowResized = () => {
        const w = Math.max(320, container.clientWidth || gui.width)
        const h = Math.min(280, Math.round((w / cols) * (rows / cols) * 1.2))
        gui.resizeCanvas(w, h)
      }
    }

    const instance = new p5(sketch, container)

    return {
      sync(state) {
        view.targetSequence = state.targetSequence ? state.targetSequence.slice() : []
        view.nextTargetSequence = state.nextTargetSequence ? state.nextTargetSequence.slice() : []
        view.eighthIndexInPhrase = typeof state.eighthIndexInPhrase === 'number' ? state.eighthIndexInPhrase : 0
        view.laneEighthGlobal = typeof state.laneEighthGlobal === 'number' ? state.laneEighthGlobal : 0
        view.gameState = state.gameState || 'idle'
        if (typeof state.phraseEighths === 'number') view.phraseEighths = state.phraseEighths
        if (typeof state.lapEighths === 'number') view.lapEighths = state.lapEighths
      },
      remove() {
        if (instance && typeof instance.remove === 'function') instance.remove()
      },
    }
  }

  window.createBeatSurferSequenceGrid = createSequenceGrid
})()
