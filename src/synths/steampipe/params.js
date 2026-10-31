// params/steampipeParams.js
export default function steampipeParams(synth) {
  const p = (name, type, value, min, max, curve = 1) => ({
    name, type, value, min, max, curve,
    callback: (x, time = null) => synth.applyParam(name, x, time),
  });
  return [
    // ---------------- THE STEAM
    p('attack',        'vco', 0.08, 0.001, 10, 3),
    p('decay',         'vco', 0.4,  0.001, 10, 3),
    p('sustain',       'vco', 0.85, 0, 1),
    p('release',       'vco', 0.4,  0.001, 10, 3),
    p('envKeytrack',   'vca', 0,    0, 1),     // 1 = times halve per octave
    p('velocity',      'vca', 0.5,  0, 1),
    p('dcNoise',       'vca', 0.15, 0, 1),     // 0 = pressure (DC), 1 = noise
    p('noiseCutoff',   'vca', 96,   0, 135),   // MIDI pitch
    p('noiseQ',        'vca', 0,    0, 20),
    p('noiseKeytrack', 'vca', 0.5,  0, 1),
    p('noiseEnv',      'vco', 0,   -48, 48),   // semitones
    p('genAmount',     'vco', 0.5,  0, 1),
    // ---------------- THE PIPE
    p('push',          'vcf', 0.6, -2, 2),
    p('fbDecay',       'vcf', 4,   0.01, 60, 3), // T60 s
    p('fbRelease',     'vcf', 0.3, 0.01, 60, 3),
    p('polarity',      'vcf', 0,   0, 1),
    p('saturation',    'vcf', 0.3, 0, 1),
    p('symmetry',      'vcf', 0,   0, 1),
    p('tune',          'hidden', 0,  -24, 24),
    p('fine',          'hidden', 0,  -100, 100),
    p('stiffness',     'vcf', 0,  -1, 1),
    p('split',         'vcf', 0,   0, 1),
    p('splitPoint',    'vcf', 0.5, 0, 1),
    p('hpf',           'vcf', -12, -48, 48),
    p('lpf',           'vcf', 36, -24, 96),
    p('delayMod',      'vcf', 0,  -12, 12),
    // ---------------- TUNE / ENGINE menus
    p('hpComp',        'hidden', 1, 0, 1),
    p('lpComp',        'hidden', 1, 0, 1),
    p('filterKeytrack','hidden', 1, 0, 1),
    p('symMode',       'hidden', 0, 0, 1),
  ];
}