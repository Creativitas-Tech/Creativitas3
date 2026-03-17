// BeatSurferNexus utilities (same as Beat Surfer)
(() => {
  'use strict'

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
    return true
  }

  function formatColoredSeq(seq, colors) {
    return seq
      .map(n => '<span style="color:' + colors[n] + ';font-weight:bold">' + (n + 1) + '</span>')
      .join(',')
  }

  window.BeatSurferNexusUtil = { arraysEqual, formatColoredSeq }
})()
