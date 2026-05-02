/**
 * BeatSurferGame — rhythm game: phrase targets, health/boring meters, drums + melody.
 *
 * Flow: constructor → init() (audio graph, Nexus grid, start()) → onEighth + onInput loop.
 * Split tablet: splitRole 'primary' (drums + Transport) vs 'secondary' (melody; q–i keys).
 *
 * Phrase: eighthIndexInPhrase wraps each phrase; laneEighthGlobal only increases (sequence UI).
 */
(() => {
  'use strict'

  class BeatSurferGame {
    constructor({ Canvas, Tone, Theory, DrumSampler, Polyphony, Daisy, Reverb, NexusButton, config, util, ui, sequenceGrid, instanceId, splitRole }) {
      // Host element for HUD placement; per-instance in split-screen.
      this.Canvas = Canvas
      this.Tone = Tone
      this.Theory = Theory
      this.DrumSampler = DrumSampler
      this.Polyphony = Polyphony
      this.Daisy = Daisy
      this.Reverb = Reverb
      this.NexusButton = NexusButton

      this.instanceId = instanceId || ''
      /** 'primary' | 'secondary' | null — split tablet: one shared Transport; secondary has no drums and must not clear/stop Transport on game over. */
      this.splitRole = splitRole || null
      this.config = config
      this.util = util
      this.ui = ui
      this.sequenceGrid = sequenceGrid || null

      this.output = null // master gain
      this.verb = null
      this.d = null // DrumSampler; null for split secondary
      this.s = null // Polyphony melody

      this.loop = null // Tone.Loop → onEighth
      this.displayInterval = null // UI refresh timer
      this.gridButtons = []

      this.resetState('idle')

      // P1: 1–7. P2 split: q–u → indices 0–6 (matches GRID_ROWS / pads).
      this._onKeyDown = (e) => {
        if (e.repeat) return
        if (this.gameState !== 'playing') return
        const nPads = (this.config && this.config.GRID_BUTTON_COUNT) || 7
        const maxDigit = String.fromCharCode(48 + nPads)
        let idx = -1
        if (this.splitRole === 'secondary') {
          const map = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5, u: 6 }
          const ch = e.key.length === 1 ? e.key.toLowerCase() : ''
          if (ch && Object.prototype.hasOwnProperty.call(map, ch)) idx = map[ch]
        } else {
          const k = e.key
          if (k >= '1' && k <= maxDigit) idx = k.charCodeAt(0) - 49
        }
        if (idx >= 0) {
          e.preventDefault()
          this.onInput(idx)
        }
      }
    }

    /** Reset in-memory fields (constructor + explicit resets). */
    resetState(initialState) {
      this.gameState = initialState
      this.targetSequence = []
      this.playerSequence = []
      this.health = 100
      this.boring = 100
      this.songSection = 0
      this.beat = 0
      this.sequenceBeatsLeft = this.config.LAP_EIGHTHS * this.config.PHRASE_LAPS
      this.countInBeatsLeft = 0
      this.lastBeatTime = 0
      this.currentBPM = this.config.DEFAULT_BPM
      this.useProcedural = true
      this.PREDEFINED = [
        [0, 1, 2, 3, 4, 5, 6],
        [6, 5, 4, 3, 2, 1, 0],
        [0, 2, 4, 6, 5, 3, 1],
        [1, 3, 5, 6, 4, 2, 0],
      ]
      this.gameOverReason = null
      this.eighthIndexInPhrase = -1
      this.laneEighthGlobal = 0
      this._skipNextPhraseAdvance = false
      this.nextTargetSequence = []
      this._drumTier = 'good'
    }

    /** Build audio graph, create Nexus pads in #beatSurfer{instanceId}GridRow, register keys, start(). */
    init() {
      const { DEFAULT_BPM } = this.config

      if (typeof this.Theory !== 'undefined') this.Theory.tempo = DEFAULT_BPM
      if (typeof this.Tone !== 'undefined') this.Tone.Transport.bpm.value = DEFAULT_BPM

      // Gain → destination; drums + dry melody; melody also → reverb → out.
      this.output = new this.Tone.Multiply(.1).toDestination()
      this.verb = new this.Reverb()
      const ownsDrums = this.splitRole !== 'secondary'
      if (ownsDrums) {
        this.d = new this.DrumSampler()
        this.d.loadPreset('breakbeat')
        this.d.connect(this.output)
      } else {
        this.d = null
      }

      this.s = new this.Polyphony(this.Daisy)

      this.s.connect(this.output)
      this.s.connect(this.verb)
      this.verb.connect(this.output)

      const gridRow = document.getElementById('beatSurfer' + this.instanceId + 'GridRow')
      if (gridRow && typeof this.ui.createGridButtons === 'function') {
        this.gridButtons = this.ui.createGridButtons({
          gridRow,
          config: this.config,
          onGridChange: (i, v) => {
            try {
              this.onGridChange(i, v)
            } catch (err) {
              console.error('[BeatSurfer] onGridChange error:', err)
              throw err
            }
          },
          NexusButton: this.NexusButton,
        })
      }

      document.addEventListener('keydown', this._onKeyDown)

      if (typeof window.updateBPM === 'function') window.updateBPM(DEFAULT_BPM)
      this.Theory.tempo = DEFAULT_BPM
      this.Tone.Transport.bpm.value = DEFAULT_BPM

      this.start()
    }

    /** Procedural random phrase or PREDEFINED[songSection] when useProcedural is false. */
    generateTarget() {
      if (this.useProcedural) {
        const seq = []
        let prev = -1
        const cap = this.config.TARGET_NOTE_COUNT != null ? this.config.TARGET_NOTE_COUNT : 7
        const degLen = (this.config.MELODY_DEGREES && this.config.MELODY_DEGREES.length) || this.config.GRID_ROWS || 7
        const numNotes = Math.min(cap, degLen)
        for (let i = 0; i < this.config.TARGET_LEN; i++) {
          let n = Math.floor(Math.random() * numNotes)
          if (n === prev && i > 0 && Math.random() < 0.5) n = (n + 1) % numNotes
          seq.push(n)
          prev = n
        }
        return seq
      }
      return [...this.PREDEFINED[this.songSection % 4]]
    }

    /** Next phrase when not using procedural targets (cycles PREDEFINED). */
    peekNextPredefinedTarget() {
      return [...this.PREDEFINED[(this.songSection + 1) % 4]]
    }

    /** Current + next phrase for HUD. */
    primeTargetPair() {
      if (this.useProcedural) {
        this.targetSequence = this.generateTarget()
        this.nextTargetSequence = this.generateTarget()
      } else {
        this.targetSequence = [...this.PREDEFINED[this.songSection % 4]]
        this.nextTargetSequence = this.peekNextPredefinedTarget()
      }
    }

    /** Eighth-note steps in one full phrase (laps × lap length). */
    phraseTotalEighths() {
      return this.config.LAP_EIGHTHS * this.config.PHRASE_LAPS
    }

    /** Position within one 8-eighth lap (0–7). */
    lapLocalEighth() {
      const k = this.eighthIndexInPhrase
      if (k < 0) return -1
      return k % this.config.LAP_EIGHTHS
    }

    /** Expected pitch index on this downbeat, or undefined if off-beat / idle. */
    expectedNote() {
      if (this.gameState !== 'playing') return undefined
      const lap = this.lapLocalEighth()
      if (lap < 0 || lap >= this.config.LAP_EIGHTHS) return undefined
      if (lap % 2 !== 0) return undefined
      return this.targetSequence[lap / 2]
    }

    /** True if within TIMING_WINDOW_MS of nearest eighth boundary. */
    isOnTime(nowSeconds) {
      if (typeof nowSeconds === 'undefined') nowSeconds = this.Tone.now()
      const eighthPeriodSec = (60 / this.currentBPM) / 2
      const timeSinceBeat = nowSeconds - this.lastBeatTime
      const dist = Math.min(timeSinceBeat % eighthPeriodSec, eighthPeriodSec - (timeSinceBeat % eighthPeriodSec))
      return dist * 1000 <= this.config.TIMING_WINDOW_MS
    }

    /**
     * Applies HEALTH_LOSS_FAILED_ATTEMPT and ends the round if health hits 0.
     * @returns {boolean} true if the game stopped (caller should return early)
     */
    applyHealthLossForFailedAttempt() {
      const loss = this.config.HEALTH_LOSS_FAILED_ATTEMPT
      this.health = Math.max(0, this.health - loss)
      if (this.health <= 0) {
        this.health = 0
        this.stop('health')
        return true
      }
      return false
    }

    /** MIDI note number for grid index i (middle C anchor). */
    midiForNoteIndex(i) {
      const d = this.config.MELODY_DEGREES[i]
      return (d != null ? d : 0) + 60
    }

    /**
     * Nexus grid: full change payload (advisor pattern — branch on v.state).
     */
    onGridChange(i, v) {
      const pressed = v && typeof v === 'object' && v !== null && 'state' in v
        ? !!v.state
        : !!v
      if (pressed) this.onGridPress(i)
      else this.onGridRelease(i)
    }

    /** Pad down: legato attack then same rules as onInput (no extra one-shot note). */
    onGridPress(i) {
      if (this.gameState !== 'playing') return
      this.s.triggerAttack(this.midiForNoteIndex(i), 100, this.Tone.immediate())
      this.onInput(i, { fromGrid: true })
    }

    /** Pad up: release envelope only. */
    onGridRelease(i) {
      if (this.gameState !== 'playing') return
      this.s.triggerRelease(this.midiForNoteIndex(i))
    }

    /**
     * Keyboard / pad input while playing. Correct = expected note exists, on-time, matching pitch.
     *
     * | Situation | Health | Boring | Sound |
     * |-----------|--------|--------|--------|
     * | Correct (on-time, right pitch) | + | + | melody |
     * | Wrong pitch but on-time (`register` && wrong key) | − failed | − variety | dissonant |
     * | Expected note exists but not on-time (late/early) | − failed | — | melody |
     * | No expected note this eighth (odd eighth / rest) | — | — | melody (free play) |
     *
     * @param {number} i - note index
     * @param {{ fromGrid?: boolean }} [opts] - grid uses attack/release; skip one-shot synth here
     */
    onInput(i, opts) {
      opts = opts || {}
      const fromGrid = opts.fromGrid === true
      if (this.gameState !== 'playing') return

      const exp = this.expectedNote()
      const onTime = this.isOnTime()
      const register = exp !== undefined && onTime

      if (register && i === exp) {
        if (!fromGrid) {
          this.s.triggerAttackRelease(this.config.MELODY_DEGREES[i] + 60, 100, 0.1, Tone.immediate())
          console.log(this.config.MELODY_DEGREES[i] + 60, Tone.immediate())
        }
        // this.s.play([this.config.MELODY_DEGREES[i]], '16n')
        this.health = Math.min(100, this.health + this.config.HEALTH_PER_CORRECT_NOTE)
        this.boring = Math.min(100, this.boring + this.config.BORING_UP_ON_CORRECT_NOTE)
        this.ui.flashButton({ buttons: this.gridButtons, Canvas: this.Canvas, config: this.config }, i, 'correct')
        this.playerSequence.push(i)
        if (this.playerSequence.length > this.config.PLAYER_MAX) this.playerSequence.shift()
        if (this.boring >= 100) { this.boring = 100; this.stop('boring'); return }
        this.updateDisplay()
        return
      }

      const wrongPitchInWindow = register && i !== exp
      const offTimeButNoteExpected = exp !== undefined && !onTime
      const failedAttempt = wrongPitchInWindow || offTimeButNoteExpected

      if (failedAttempt && this.applyHealthLossForFailedAttempt()) return

      if (!fromGrid) {
        if (wrongPitchInWindow) {
          this.s.play([this.config.MELODY_DEGREES[i] + 7], '32n')
        } else {
          this.s.play([this.config.MELODY_DEGREES[i]], '32n')
        }
      }

      if (onTime) {
        this.boring = Math.max(0, this.boring - this.config.BORING_DOWN_ON_VARY_NOTE)
      } else {
        this.boring = Math.min(100, this.boring + this.config.BORING_UP_ON_OFF_GRID)
      }

      const flashType = wrongPitchInWindow ? 'wrong' : (offTimeButNoteExpected ? 'wrong' : 'neutral')
      this.ui.flashButton({ buttons: this.gridButtons, Canvas: this.Canvas, config: this.config }, i, flashType)

      this.playerSequence.push(i)
      if (this.playerSequence.length > this.config.PLAYER_MAX) this.playerSequence.shift()

      if (this.boring >= 100) { this.boring = 100; this.stop('boring'); return }

      this.updateDisplay()
    }

    /**
     * Tone.Loop @ 8n: advances phrase, applies passive health decay, rolls phrase at end.
     * Also drives count-in before first playing state.
     */
    onEighth(time) {
      this.lastBeatTime = time

      if (this.gameState === 'countIn') {
        this.countInBeatsLeft--
        if (this.countInBeatsLeft <= 0) {
          this.gameState = 'playing'
          this.playerSequence = []
          this.eighthIndexInPhrase = 0
          this._skipNextPhraseAdvance = true
          this.sequenceBeatsLeft = this.config.LAP_EIGHTHS * this.config.PHRASE_LAPS
          this._drumTier = 'good'
          if (this.d) this.d.sequence(this.config.DRUM_TRACK_GOOD, this.config.DRUM_SUBDIVISION)
        }
        this.updateDisplay()
        return
      }

      if (this.gameState !== 'playing') return

      // Passive drain; drum pattern tier follows health bands.
      this.health = Math.max(0, this.health - this.config.HEALTH_DECAY_PER_EIGHTH)

      const tier = this.health > this.config.DRUM_HEALTH_MID_THRESHOLD ? 'good'
        : this.health > this.config.DRUM_HEALTH_BAD_THRESHOLD ? 'mid'
        : 'bad'
      if (this.d && tier !== this._drumTier) {
        this._drumTier = tier
        const pattern = tier === 'good' ? this.config.DRUM_TRACK_GOOD
          : tier === 'mid' ? this.config.DRUM_TRACK_MID
          : this.config.DRUM_TRACK_BAD
        this.d.sequence(pattern, this.config.DRUM_SUBDIVISION)
      }

      this.beat = (this.beat + 1) % this.config.BEATS_PER_BAR

      const total = this.phraseTotalEighths()
      // Skip one advance on the first playing eighth after count-in.
      if (this._skipNextPhraseAdvance) {
        this._skipNextPhraseAdvance = false
      } else {
        this.eighthIndexInPhrase++
        this.laneEighthGlobal++
        if (this.eighthIndexInPhrase >= total) {
          this.eighthIndexInPhrase = 0
          this.targetSequence = this.nextTargetSequence
          this.playerSequence = []
          this.songSection++
          if (this.useProcedural) {
            this.nextTargetSequence = this.generateTarget()
          } else {
            this.nextTargetSequence = this.peekNextPredefinedTarget()
          }
        }
      }

      this.sequenceBeatsLeft = total - this.eighthIndexInPhrase

      if (this.health <= 0) { this.health = 0; this.stop('health'); return }

      this.updateDisplay()
    }

    /** Delegates to UI module + optional p5 sequence grid. */
    updateDisplay() {
      const phraseEighths = this.phraseTotalEighths()
      this.ui.updateDisplay({
        state: {
          Canvas: this.Canvas,
          gameState: this.gameState,
          countInBeatsLeft: this.countInBeatsLeft,
          targetSequence: this.targetSequence,
          nextTargetSequence: this.nextTargetSequence,
          playerSequence: this.playerSequence,
          sequenceBeatsLeft: this.sequenceBeatsLeft,
          currentBPM: this.currentBPM,
          health: this.health,
          boring: this.boring,
          onPlayAgain: () => this.start(),
          eighthIndexInPhrase: this.eighthIndexInPhrase,
          phraseEighths,
        },
        config: this.config,
        util: this.util,
      })

      if (this.sequenceGrid && typeof this.sequenceGrid.sync === 'function') {
        const k = Math.max(0, this.eighthIndexInPhrase)
        this.sequenceGrid.sync({
          targetSequence: this.targetSequence,
          nextTargetSequence: this.nextTargetSequence
            ? this.nextTargetSequence.slice()
            : [],
          eighthIndexInPhrase: k,
          laneEighthGlobal: Math.max(0, this.laneEighthGlobal),
          phraseEighths: this.phraseTotalEighths(),
          lapEighths: this.config.LAP_EIGHTHS,
          gameState: this.gameState,
        })
      }
    }

    /** New run: count-in, prime targets, start Transport + drum loop + UI timer. */
    start() {
      this.gameState = 'countIn'
      this.countInBeatsLeft = this.config.COUNT_IN_EIGHTHS

      this.health = 100
      this.boring = 0
      this.songSection = 0
      this.beat = 0
      this.sequenceBeatsLeft = this.config.LAP_EIGHTHS * this.config.PHRASE_LAPS
      this.currentBPM = this.config.DEFAULT_BPM
      this.playerSequence = []
      this.primeTargetPair()
      this.gameOverReason = null
      this.eighthIndexInPhrase = -1
      this.laneEighthGlobal = 0
      this._skipNextPhraseAdvance = false

      this.lastBeatTime = this.Tone.now()

      this.Theory.tempo = this.config.DEFAULT_BPM
      this.Tone.Transport.bpm.value = this.config.DEFAULT_BPM
      // Split-screen: one shared Tone.Transport; never clear() (would drop the other player's Tone.Loop). Single-player: clear for a clean restart.
      const split = this.splitRole === 'primary' || this.splitRole === 'secondary'
      if (!split) {
        this.Tone.Transport.clear()
      }
      this.Tone.Transport.start()

      this._drumTier = 'good'
      if (this.d) this.d.sequence(this.config.DRUM_TRACK_GOOD, this.config.DRUM_SUBDIVISION)

      if (this.loop) this.loop.stop()
      this.loop = new this.Tone.Loop((time) => this.onEighth(time), '8n')
      this.loop.start(0)

      this.updateDisplay()

      if (this.displayInterval) clearInterval(this.displayInterval)
      // Redundant with onEighth but keeps HUD smooth if Transport glitches.
      this.displayInterval = setInterval(() => this.updateDisplay(), 100)
    }

    /**
     * Game over: stop this instance’s loop; play sting. Single-player stops Transport + drums.
     * Split: only primary stops Transport on manual stop; primary always stops drums when present.
     */
    stop(reason) {
      this.gameOverReason = reason
      this.gameState = 'gameOver'
      this.updateDisplay()

      if (this.loop) this.loop.stop()
      if (this.displayInterval) clearInterval(this.displayInterval)

      this.s.play('7 4 2 0')

      const split = this.splitRole === 'primary' || this.splitRole === 'secondary'
      if (!split) {
        this.Tone.Transport.stop(this.Tone.now() + 2)
        if (this.d) setTimeout(() => this.d.stop(), 500)
        return
      }

      if (this.splitRole === 'primary') {
        if (reason === 'manual') this.Tone.Transport.stop(this.Tone.now() + 2)
        if (this.d) setTimeout(() => this.d.stop(), 500)
      }
    }
  }

  window.BeatSurferGame = BeatSurferGame
})()
