/**
 * DSP Analysis: Spectrogram, Short-Time Energy, Zero-Crossing Rate, and F0 Tracking
 */

export interface SpectrogramFrame {
  timeSec: number;
  frequencies: Float32Array; // Normalized magnitude (0 - 1)
}

export interface AcousticFeatures {
  timeStepMs: number;
  rmsEnergy: Float32Array;
  zeroCrossingRate: Float32Array;
  spectralCentroid: Float32Array;
  f0Contour: Float32Array; // Pitch in Hz (0 = unvoiced)
  silenceThreshold: number;
  vowelOnsetCandidateMs: number;
  consonantOnsetCandidateMs: number;
  decayOffsetCandidateMs: number;
}

/**
 * Computes acoustic features across audio buffer frames
 */
export function analyzeAcousticFeatures(
  audioBuffer: AudioBuffer,
  frameSize: number = 1024,
  hopSize: number = 256
): AcousticFeatures {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  const timeStepMs = (hopSize / sampleRate) * 1000;

  const rmsEnergy = new Float32Array(numFrames);
  const zeroCrossingRate = new Float32Array(numFrames);
  const spectralCentroid = new Float32Array(numFrames);
  const f0Contour = new Float32Array(numFrames);

  let maxRms = 0.0001;

  for (let f = 0; f < numFrames; f++) {
    const startIdx = f * hopSize;
    let sumSq = 0;
    let zcrCount = 0;
    let weightedFreqSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frameSize; i++) {
      const idx = startIdx + i;
      const s = channelData[idx];
      sumSq += s * s;

      if (i > 0) {
        const prevS = channelData[idx - 1];
        if ((s >= 0 && prevS < 0) || (s < 0 && prevS >= 0)) {
          zcrCount++;
        }
      }

      // Approximate frequency weighting
      const mag = Math.abs(s);
      const freq = (i / frameSize) * (sampleRate / 2);
      weightedFreqSum += freq * mag;
      magnitudeSum += mag;
    }

    const rms = Math.sqrt(sumSq / frameSize);
    rmsEnergy[f] = rms;
    if (rms > maxRms) maxRms = rms;

    zeroCrossingRate[f] = zcrCount / frameSize;
    spectralCentroid[f] = magnitudeSum > 0.0001 ? (weightedFreqSum / magnitudeSum) : 0;

    // Pitch detection via autocorrelation if frame has enough energy
    if (rms > 0.02) {
      f0Contour[f] = estimatePitchAutocorrelation(channelData, startIdx, frameSize, sampleRate);
    } else {
      f0Contour[f] = 0;
    }
  }

  // Normalize RMS energy relative to peak
  for (let f = 0; f < numFrames; f++) {
    rmsEnergy[f] = rmsEnergy[f] / maxRms;
  }

  // Silence threshold is ~5% of peak RMS or adaptive noise floor
  const silenceThreshold = 0.06;

  // Find consonant onset: first time energy rises above silence threshold
  let consonantOnsetCandidateMs = 100;
  for (let f = 0; f < numFrames; f++) {
    if (rmsEnergy[f] > silenceThreshold) {
      consonantOnsetCandidateMs = Math.max(10, f * timeStepMs - 15);
      break;
    }
  }

  // Find vowel onset: strong jump in energy accompanied by pitch presence or drop in ZCR
  let vowelOnsetCandidateMs = consonantOnsetCandidateMs + 80;
  for (let f = Math.floor(consonantOnsetCandidateMs / timeStepMs); f < numFrames - 5; f++) {
    const energyJump = rmsEnergy[f] > 0.3;
    const hasPeriodicPitch = f0Contour[f] > 80 && f0Contour[f] < 800;
    const lowZcr = zeroCrossingRate[f] < 0.15;

    if (energyJump && (hasPeriodicPitch || lowZcr)) {
      vowelOnsetCandidateMs = f * timeStepMs;
      break;
    }
  }

  // Find decay/cutoff: where energy permanently drops back near silence
  let decayOffsetCandidateMs = (numFrames - 1) * timeStepMs;
  for (let f = numFrames - 1; f > Math.floor(vowelOnsetCandidateMs / timeStepMs); f--) {
    if (rmsEnergy[f] > 0.12) {
      decayOffsetCandidateMs = Math.min((numFrames - 1) * timeStepMs, (f + 2) * timeStepMs);
      break;
    }
  }

  return {
    timeStepMs,
    rmsEnergy,
    zeroCrossingRate,
    spectralCentroid,
    f0Contour,
    silenceThreshold,
    vowelOnsetCandidateMs,
    consonantOnsetCandidateMs,
    decayOffsetCandidateMs,
  };
}

/**
 * Robust pitch estimation using Normalized Autocorrelation
 */
function estimatePitchAutocorrelation(
  data: Float32Array,
  start: number,
  length: number,
  sampleRate: number
): number {
  const minFreq = 70;  // C2
  const maxFreq = 900; // A5
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  let bestLag = -1;
  let maxCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < length - lag; i++) {
      const s1 = data[start + i];
      const s2 = data[start + i + lag];
      sum += s1 * s2;
      norm1 += s1 * s1;
      norm2 += s2 * s2;
    }

    const norm = Math.sqrt(norm1 * norm2);
    if (norm > 0.0001) {
      const corr = sum / norm;
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
  }

  // Autocorrelation threshold for voiced singing
  if (maxCorr > 0.55 && bestLag > 0) {
    return sampleRate / bestLag;
  }
  return 0; // Unvoiced
}

/**
 * Computes multi-resolution spectrogram pixels for canvas display
 */
export function computeSpectrogramCanvasData(
  audioBuffer: AudioBuffer,
  width: number = 600,
  height: number = 120
): ImageData {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  const fftSize = 512;
  const halfFft = fftSize / 2;

  // Offscreen canvas image buffer
  const imgData = new ImageData(width, height);
  const pixels = imgData.data;

  // Windowing function (Hann)
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  for (let x = 0; x < width; x++) {
    const centerSample = Math.floor((x / width) * totalSamples);
    const startSample = Math.max(0, centerSample - halfFft);

    // Compute simple magnitude response across frequency bins
    for (let y = 0; y < height; y++) {
      // Invert y so 0Hz is at bottom
      const freqBin = Math.floor(((height - 1 - y) / height) * halfFft);
      const targetFreq = (freqBin / halfFft) * (sampleRate / 4); // Focus on vocal range <= 11kHz

      let real = 0;
      let imag = 0;
      const step = 2;

      for (let n = 0; n < fftSize; n += step) {
        const s = (channelData[startSample + n] || 0) * hann[n];
        const angle = (2 * Math.PI * targetFreq * n) / sampleRate;
        real += s * Math.cos(angle);
        imag -= s * Math.sin(angle);
      }

      const mag = Math.sqrt(real * real + imag * imag);
      const normMag = Math.min(1, Math.log10(1 + mag * 18)); // Logarithmic scaling

      // Heatmap color: Deep slate/blue -> Violet -> Amber -> White
      const pixelIdx = (y * width + x) * 4;
      if (normMag < 0.25) {
        const t = normMag / 0.25;
        pixels[pixelIdx] = Math.floor(15 + t * 40);     // R
        pixels[pixelIdx + 1] = Math.floor(23 + t * 20); // G
        pixels[pixelIdx + 2] = Math.floor(42 + t * 80); // B
      } else if (normMag < 0.65) {
        const t = (normMag - 0.25) / 0.4;
        pixels[pixelIdx] = Math.floor(55 + t * 160);
        pixels[pixelIdx + 1] = Math.floor(43 + t * 50);
        pixels[pixelIdx + 2] = Math.floor(122 - t * 40);
      } else {
        const t = (normMag - 0.65) / 0.35;
        pixels[pixelIdx] = Math.floor(215 + t * 40);
        pixels[pixelIdx + 1] = Math.floor(93 + t * 162);
        pixels[pixelIdx + 2] = Math.floor(82 + t * 173);
      }
      pixels[pixelIdx + 3] = 230; // Alpha
    }
  }

  return imgData;
}
