// BeatSurferNexus config (same values as Beat Surfer)
(() => {
  'use strict'

  const NOTE_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea']
  const NOTE_COLORS_RGB = [[37, 99, 235], [22, 163, 74], [234, 88, 12], [147, 51, 234]]

  window.BeatSurferNexusConfig = Object.freeze({
    DEFAULT_BPM: 80,
    DRUM_TRACK: '[O*][X*]',

    PLAYER_MAX: 20,
    TARGET_LEN: 4,
    WINDOW: 4,
    BEATS_PER_BAR: 16,
    SEQUENCE_BEATS: 16,
    COUNT_IN_BEATS: 4,

    HEALTH_DECAY_PER_BAR: 4,
    HEALTH_DROP: 35,
    HEALTH_REGEN: 15,
    BORING_UP_ON_MATCH_NOTE: 12,
    BORING_DOWN_ON_VARY_NOTE: 8,
    BORING_UP_ON_MATCH: 35,

    BORING_LOW_THRESHOLD: 30,
    BORING_HIGH_THRESHOLD: 50,
    PENALTY_HIGH_MULT: 1.4,
    PENALTY_LOW_MULT: 0.6,

    TIMING_WINDOW_MS: 280,

    MELODY_DEGREES: [0, 2, 4, 7],

    NOTE_COLORS,
    NOTE_COLORS_RGB,
  })
})()
