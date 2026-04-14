/**
 * BeatSurferConfig — tunables for BeatSurferGame.
 * (UROP split: Config | Util | UI "Display" live in separate files.)
 */
(() => {
  'use strict'

  const NOTE_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#9333ea',
    '#dc2626', '#0891b2', '#ca8a04', '#db2777',
  ]
  const NOTE_COLORS_RGB = [
    [37, 99, 235], [22, 163, 74], [234, 88, 12], [147, 51, 234],
    [220, 38, 38], [8, 145, 178], [202, 138, 4], [219, 39, 119],
  ]

  window.BeatSurferConfig = Object.freeze({
    DEFAULT_BPM: 80,
    DRUM_SUBDIVISION: '8n',
    DRUM_TRACK_GOOD: '[O*][X*]',
    DRUM_TRACK_MID:  '[O.][X.]',
    DRUM_TRACK_BAD:  '[O...][....]',
    DRUM_HEALTH_MID_THRESHOLD: 60,
    DRUM_HEALTH_BAD_THRESHOLD: 30,

    PLAYER_MAX: 20,
    TARGET_LEN: 4,
    /** Pool size for random targets: 4 => notes 1-4 (indices 0-3). */
    TARGET_NOTE_COUNT: 4,
    BEATS_PER_BAR: 8,

    LAP_EIGHTHS: 8,
    PHRASE_LAPS: 2,

    COUNT_IN_EIGHTHS: 8,

    HEALTH_DECAY_PER_EIGHTH: 1,
    HEALTH_PER_CORRECT_NOTE: 4,
    /** Subtracted on any failed attempt (wrong pitch in window, or off-time when a note was expected). */
    HEALTH_LOSS_FAILED_ATTEMPT: 4,
    BORING_UP_ON_CORRECT_NOTE: 5,
    BORING_DOWN_ON_VARY_NOTE: 2,
    BORING_UP_ON_OFF_GRID: 3,

    TIMING_WINDOW_MS: 400,

    MELODY_DEGREES: [0, 2, 4, 5, 7, 9, 11, 12],

    GRID_ROWS: 8,
    GRID_COLS: 8,
    GRID_BUTTON_COUNT: 6,

    NOTE_COLORS,
    NOTE_COLORS_RGB,
  })
})()
