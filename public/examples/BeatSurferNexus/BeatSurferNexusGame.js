// BeatSurferNexus — same game logic as Beat Surfer, Nexus UI only
(() => {
  'use strict'

  class BeatSurferNexusGame {
    constructor({ Canvas, Tone, Theory, DrumSampler, Polyphony, Daisy, Reverb, NexusButton, config, util, ui }) {
      this.Canvas = Canvas
      this.Tone = Tone
      this.Theory = Theory
      this.DrumSampler = DrumSampler
      this.Polyphony = Polyphony
      this.Daisy = Daisy
      this.Reverb = Reverb
      this.NexusButton = NexusButton

      this.config = config
      this.util = util
      this.ui = ui

      this.output = null
      this.verb = null
      this.d = null
      this.s = null

      this.loop = null
      this.displayInterval = null
      this.buttons = []

      this.resetState('idle')

      this._onKeyDown = (e) => {
        if (e.repeat) return
        if (this.gameState !== 'playing') return
        if (e.key === '1') { e.preventDefault(); this.onInput(0); return }
        if (e.key === '2') { e.preventDefault(); this.onInput(1); return }
        if (e.key === '3') { e.preventDefault(); this.onInput(2); return }
        if (e.key === '4') { e.preventDefault(); this.onInput(3); return }
      }
    }

    resetState(initialState) {
      this.gameState = initialState
      this.targetSequence = []
      this.playerSequence = []
      this.health = 100
      this.boring = 100
      this.songSection = 0
      this.beatIndex = 0
      this.beat = 0
      this.totalBeats = 0
      this.sequenceBeatsLeft = this.config.SEQUENCE_BEATS
      this.countInBeatsLeft = 0
      this.lastBeatTime = 0
      this.currentBPM = this.config.DEFAULT_BPM
      this.useProcedural = true
      this.PREDEFINED = [[0, 1, 2, 3], [0, 0, 1, 1], [2, 1, 0, 1], [0, 2, 1, 3]]
      this.gameOverReason = null
    }

    init() {
      const { DEFAULT_BPM } = this.config

      if (typeof this.Theory !== 'undefined') this.Theory.tempo = DEFAULT_BPM
      if (typeof this.Tone !== 'undefined') this.Tone.Transport.bpm.value = DEFAULT_BPM

      this.output = new this.Tone.Multiply(.1).toDestination()
      this.verb = new this.Reverb()
      this.d = new this.DrumSampler()
      this.d.loadPreset('breakbeat')

      this.s = new this.Polyphony(this.Daisy)

      this.d.connect(this.output)
      this.s.connect(this.output)
      this.s.connect(this.verb)
      this.verb.connect(this.output)

      this.buttons = this.ui.createButtons({
        Canvas: this.Canvas,
        config: this.config,
        onPress: (i) => {
          try {
            if (this.gameState === 'playing') this.onInput(i)
          } catch (err) {
            console.error('[BeatSurferNexus] onPress/onInput error:', err)
            throw err
          }
        },
        NexusButton: this.NexusButton,
      })

      document.addEventListener('keydown', this._onKeyDown)

      if (typeof window.updateBPM === 'function') window.updateBPM(DEFAULT_BPM)
      this.Theory.tempo = DEFAULT_BPM
      this.Tone.Transport.bpm.value = DEFAULT_BPM

      this.start()
    }

    generateTarget() {
      if (this.useProcedural) {
        const seq = []
        let prev = -1
        for (let i = 0; i < this.config.TARGET_LEN; i++) {
          let n = Math.floor(Math.random() * 4)
          if (n === prev && i > 0 && Math.random() < 0.5) n = (n + 1) % 4
          seq.push(n)
          prev = n
        }
        return seq
      }
      return [...this.PREDEFINED[this.songSection % 4]]
    }

    expectedNote() {
      return this.targetSequence[this.beatIndex]
    }

    getHealthDrop() {
      const c = this.config
      if (this.boring >= c.BORING_HIGH_THRESHOLD) return Math.round(c.HEALTH_DROP * c.PENALTY_HIGH_MULT)
      if (this.boring < c.BORING_LOW_THRESHOLD) return Math.round(c.HEALTH_DROP * c.PENALTY_LOW_MULT)
      return c.HEALTH_DROP
    }

    isOnTime(nowSeconds) {
      if (typeof nowSeconds === 'undefined') nowSeconds = this.Tone.now()
      const beatPeriodSec = 60 / this.currentBPM
      const timeSinceBeat = nowSeconds - this.lastBeatTime
      const distToNearestBeat = Math.min(timeSinceBeat % beatPeriodSec, beatPeriodSec - (timeSinceBeat % beatPeriodSec))
      return distToNearestBeat * 1000 <= this.config.TIMING_WINDOW_MS
    }

    isMatchingForSubmit() {
      const tw = this.targetSequence.slice(-this.config.WINDOW)
      const pw = this.playerSequence.slice(-this.config.WINDOW)
      return pw.length === this.config.WINDOW && this.util.arraysEqual(pw, tw)
    }

    onInput(i) {
      if (this.gameState !== 'playing') return

      // if (!this.isOnTime()) {
      //   this.s.play([0], '32n')
      //   this.ui.flashButton({ buttons: this.buttons, Canvas: this.Canvas, config: this.config }, i, true)
      //   this.health = Math.max(0, this.health - this.getHealthDrop())
      //   if (this.health <= 0) { this.health = 0; this.stop('health') }
      //   return
      // }

      const exp = this.expectedNote()
      if (exp !== undefined) {
        if (i === exp) {
          this.boring = Math.min(100, this.boring + this.config.BORING_UP_ON_MATCH_NOTE)
          this.s.play([this.config.MELODY_DEGREES[i]], '32n')
        }
        else {
          this.boring = Math.max(0, this.boring - this.config.BORING_DOWN_ON_VARY_NOTE)
          this.s.play([this.config.MELODY_DEGREES[i]+7], '32n')
        }

      }



      this.ui.flashButton({ buttons: this.buttons, Canvas: this.Canvas, config: this.config }, i, false)

      this.playerSequence.push(i)
      if (this.playerSequence.length > this.config.PLAYER_MAX) this.playerSequence.shift()



      this.health = Math.min(100, this.health + 5)
      if (this.health <= 0) { this.health = 0; this.stop('health'); return }



      if (this.boring >= 100) { this.boring = 100; this.stop('boring') }

      if (this.isMatchingForSubmit()) {
        this.boring = Math.min(100, this.boring + this.config.BORING_UP_ON_MATCH)
        this.health = Math.min(100, this.health + this.config.HEALTH_REGEN)
        this.playerSequence = []
        if (this.boring >= 100) { this.boring = 100; this.stop('boring') }
      }

      this.updateDisplay()
    }

    onBeat(time) {
      this.lastBeatTime = time
      //this.s.triggerAttackRelease(12, 100, this.Tone.Time('4n').toSeconds(), time)

      if (this.gameState === 'countIn') {
        this.countInBeatsLeft--
        if (this.countInBeatsLeft <= 0) {
          this.gameState = 'playing'
          this.targetSequence = this.generateTarget()
          this.beatIndex = 0
          this.playerSequence = []
          this.sequenceBeatsLeft = this.config.SEQUENCE_BEATS
          this.d.sequence(this.config.DRUM_TRACK, '8n')
        }
        this.updateDisplay()
        return
      }

      if (this.gameState !== 'playing') return

      this.beat++
      this.beat %= this.config.BEATS_PER_BAR
      this.beatIndex = (this.beatIndex + 1) % this.config.TARGET_LEN
      this.totalBeats++

      this.health = Math.max(0, this.health - this.config.HEALTH_DECAY_PER_BAR)
      this.sequenceBeatsLeft--

      if (this.sequenceBeatsLeft <= 0) {
        this.songSection++
        this.targetSequence = this.generateTarget()
        this.beatIndex = 0
        this.playerSequence = []
        this.sequenceBeatsLeft = this.config.SEQUENCE_BEATS
      }

      if (this.health <= 0) { this.health = 0; this.stop('health'); return }

      this.updateDisplay()
    }

    updateDisplay() {
      this.ui.updateDisplay({
        state: {
          Canvas: this.Canvas,
          gameState: this.gameState,
          countInBeatsLeft: this.countInBeatsLeft,
          targetSequence: this.targetSequence,
          playerSequence: this.playerSequence,
          sequenceBeatsLeft: this.sequenceBeatsLeft,
          currentBPM: this.currentBPM,
          health: this.health,
          boring: this.boring,
          onPlayAgain: () => this.start(),
        },
        config: this.config,
        util: this.util,
      })
    }

    start() {
      this.gameState = 'countIn'
      this.countInBeatsLeft = this.config.COUNT_IN_BEATS

      this.health = 100
      this.boring = 0
      this.songSection = 0
      this.beatIndex = 0
      this.beat = 0
      this.totalBeats = 0
      this.sequenceBeatsLeft = this.config.SEQUENCE_BEATS
      this.currentBPM = this.config.DEFAULT_BPM
      this.playerSequence = []
      this.targetSequence = []
      this.gameOverReason = null

      this.lastBeatTime = this.Tone.now()

      this.Theory.tempo = this.config.DEFAULT_BPM
      this.Tone.Transport.bpm.value = this.config.DEFAULT_BPM
      this.Tone.Transport.clear()
      this.Tone.Transport.start()

      this.d.sequence(this.config.DRUM_TRACK, '8n')

      if (this.loop) this.loop.stop()
      this.loop = new this.Tone.Loop((time) => this.onBeat(time), '4n')
      this.loop.start(0)

      this.updateDisplay()

      if (this.displayInterval) clearInterval(this.displayInterval)
      this.displayInterval = setInterval(() => this.updateDisplay(), 100)
    }

    stop(reason) {
      this.gameOverReason = reason
      this.gameState = 'gameOver'
      this.updateDisplay()

      if (this.loop) this.loop.stop()
      if (this.displayInterval) clearInterval(this.displayInterval)

      this.Tone.Transport.stop(this.Tone.now() + 2)
      this.s.play('7 4 2 0')
      setTimeout(() => this.d.stop(), 500)
    }
  }

  window.BeatSurferNexusGame = BeatSurferNexusGame
})()
