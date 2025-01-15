function harmonicSeries(numHarmonics) {
  return Array.from({ length: numHarmonics }, (_, n) => 1 / (n + 1));
}


function geometricSeries(numHarmonics, decayFactor = 0.5) {
  return Array.from({ length: numHarmonics }, (_, n) => Math.pow(decayFactor, n));
}


function trigSeries(numHarmonics, freqFactor = 1) {
  return Array.from({ length: numHarmonics }, (_, n) => {
    return Math.sin((n + 1) * freqFactor) / (n + 1);
  });
}

function formantSeries(numHarmonics, peakFreqs = [3, 5, 7], width = 1) {
  return Array.from({ length: numHarmonics }, (_, n) => {
    const harmonic = n + 1;
    // Boost harmonics near peakFreqs
    const boost = peakFreqs.reduce((sum, peak) => {
      const distance = Math.abs(harmonic - peak);
      return sum + Math.exp(-Math.pow(distance / width, 2)); // Gaussian-like emphasis
    }, 0);
    return (1 / harmonic) * boost;
  });
}

function noiseSeries(numHarmonics, noiseFactor = 0.1) {
  return Array.from({ length: numHarmonics }, (_, n) => {
    const harmonic = 1 / (n + 1);
    const noise = (Math.random() - 0.5) * noiseFactor;
    return harmonic + noise;
  });
}
