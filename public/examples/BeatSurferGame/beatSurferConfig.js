/**
 * BeatSurferConfig — frozen tunables for BeatSurferGame (drums, phrase shape, scoring, grid).
 * Read by game + UI + p5 sequence grid; change here to rebalance difficulty or layout constants.
 */
(() => {
  'use strict'

  const NOTE_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#9333ea',
    '#dc2626', '#0891b2',
  ]
  const NOTE_COLORS_RGB = [
    [37, 99, 235], [22, 163, 74], [234, 88, 12], [147, 51, 234],
    [220, 38, 38], [8, 145, 178],
  ]

  window.BeatSurferConfig = Object.freeze({
    // Transport + drum Machine patterns (health switches tier).
    DEFAULT_BPM: 80,
    DRUM_SUBDIVISION: '8n',
    DRUM_TRACK_GOOD: '[O*][X*]',
    DRUM_TRACK_MID:  '[O.][X.]',
    DRUM_TRACK_BAD:  '[O...][....]',
    DRUM_HEALTH_MID_THRESHOLD: 60,
    DRUM_HEALTH_BAD_THRESHOLD: 30,

    // Phrase content: random length TARGET_LEN, note pool TARGET_NOTE_COUNT; bar length for UI.
    PLAYER_MAX: 20,
    TARGET_LEN: 4,
    /** Pool size for random targets: 4 => notes 1-4 (indices 0-3). */
    TARGET_NOTE_COUNT: 4,
    BEATS_PER_BAR: 8,

    // One phrase = LAP_EIGHTHS * PHRASE_LAPS eighth notes (see phraseTotalEighths).
    LAP_EIGHTHS: 8,
    PHRASE_LAPS: 2,

    COUNT_IN_EIGHTHS: 8,

    // Scoring: passive decay, rewards, failed-attempt penalty, boring meter deltas.
    HEALTH_DECAY_PER_EIGHTH: 1,
    HEALTH_PER_CORRECT_NOTE: 4,
    /** Subtracted on any failed attempt (wrong pitch in window, or off-time when a note was expected). */
    HEALTH_LOSS_FAILED_ATTEMPT: 4,
    BORING_UP_ON_CORRECT_NOTE: 5,
    BORING_DOWN_ON_VARY_NOTE: 2,
    BORING_UP_ON_OFF_GRID: 3,

    TIMING_WINDOW_MS: 400,

    /** Scale degrees for grid row indices 0..GRID_ROWS-1 (melody + MIDI). */
    MELODY_DEGREES: [0, 2, 4, 5, 7, 9],

    // p5 piano-roll rows; GRID_BUTTON_COUNT matches playable pads / rows.
    GRID_ROWS: 6,
    GRID_COLS: 8,
    GRID_BUTTON_COUNT: 6,
    /** Nexus circular pad pixel size (createGridButtons). */
    NEXUS_BUTTON_WIDTH: 96,
    NEXUS_BUTTON_HEIGHT: 80,

    NOTE_COLORS,
    NOTE_COLORS_RGB,
  })
})()
