// params/steampipeParams.js
export default function params(synth) {
  const p = (name, type, value, min, max, curve = 1) => ({
    name, type, value, min, max, curve,
    callback: (x, time = null) => synth.applyParam(name, x, time),
  });
  return [
    // ---------------- THE STEAM
    p('attack',        'vco', 0.08, 0.001, 10, 3),
    p('decay',         'vco', 0.4,  0.001, 10, 3),
    p('sustain',       'vco', 0.85, 0, 1),
    p('release',       'vco', 0.4,  0.001, 10, 3)
  ];
}