/**
 * BeatSurferUtil — small pure helpers (UROP Util module).
 */
(() => {
  'use strict'

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
    return true
  }

  function formatColoredSeq(seq, colors) {
    return seq
      .map((n) => {
        const c = (colors && colors[n]) || '#9ca3af'
        return '<span style="color:' + c + ';font-weight:bold">' + (n + 1) + '</span>'
      })
      .join(',')
  }

  window.BeatSurferUtil = { arraysEqual, formatColoredSeq }
})()
