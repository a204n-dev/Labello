/**
 * DSP Analysis: Spectrogram, Short-Time Energy, Zero-Crossing Rate, and F0 Tracking
 */

export interface SpectrogramFrame {
  timeSec: number;
  frequencies: Float32Array; // Normalized magnitude (0 - 1)
}

export interface AcousticFeatures {
  timeStepMs: number;
  durationMs: number;
  hasSignal: boolean;
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
  hopSize: number = 256,
  trackPitch: boolean = true
): AcousticFeatures {
  if (!Number.isInteger(frameSize) || frameSize < 2 || (frameSize & (frameSize - 1)) !== 0) {
    throw new RangeError('Analysis frame size must be a power of two greater than one.');
  }
  if (!Number.isInteger(hopSize) || hopSize < 1) {
    throw new RangeError('Analysis hop size must be a positive integer.');
  }
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const durationMs = audioBuffer.duration * 1000;
  const numFrames = Math.max(1, Math.floor(Math.max(0, channelData.length - frameSize) / hopSize) + 1);
  const timeStepMs = (hopSize / sampleRate) * 1000;
  const frameDurationMs = (frameSize / sampleRate) * 1000;

  const rmsEnergy = new Float32Array(numFrames);
  const zeroCrossingRate = new Float32Array(numFrames);
  const spectralCentroid = new Float32Array(numFrames);
  const f0Contour = new Float32Array(numFrames);
  const fftReal = new Float32Array(frameSize);
  const fftImag = new Float32Array(frameSize);
  const hann = new Float32Array(frameSize);

  let maxRms = 0;
  for (let i = 0; i < frameSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / Math.max(1, frameSize - 1)));
  }

  for (let f = 0; f < numFrames; f++) {
    const startIdx = f * hopSize;
    let sumSq = 0;
    let zcrCount = 0;

    for (let i = 0; i < frameSize; i++) {
      const idx = startIdx + i;
      const s = channelData[idx] || 0;
      sumSq += s * s;
      fftReal[i] = s * hann[i];
      fftImag[i] = 0;

      if (i > 0) {
        const prevS = channelData[idx - 1] || 0;
        if ((s >= 0 && prevS < 0) || (s < 0 && prevS >= 0)) {
          zcrCount++;
        }
      }
    }

    const rms = Math.sqrt(sumSq / frameSize);
    rmsEnergy[f] = rms;
    if (rms > maxRms) maxRms = rms;

    zeroCrossingRate[f] = zcrCount / frameSize;
    spectralCentroid[f] = computeSpectralCentroid(fftReal, fftImag, sampleRate);

    if (trackPitch && rms > 0.02) {
      f0Contour[f] = estimatePitchAutocorrelation(channelData, startIdx, frameSize, sampleRate);
    }
  }

  // Normalize RMS energy relative to peak
  for (let f = 0; f < numFrames; f++) {
    rmsEnergy[f] = maxRms > 0 ? rmsEnergy[f] / maxRms : 0;
  }

  const hasSignal = maxRms > 0.0001;
  const sortedRms = Array.from(rmsEnergy, (energy) => energy * maxRms).sort((a, b) => a - b);
  const noiseFloor = sortedRms[Math.floor((sortedRms.length - 1) * 0.2)] || 0;
  const onsetThreshold = hasSignal
    ? Math.min(maxRms * 0.35, Math.max(maxRms * 0.08, noiseFloor * 2.5))
    : Number.POSITIVE_INFINITY;
  const decayThreshold = hasSignal
    ? Math.min(maxRms * 0.2, Math.max(maxRms * 0.035, noiseFloor * 2))
    : Number.POSITIVE_INFINITY;

  let consonantOnsetCandidateMs = 0;
  let onsetFrame = 0;
  for (let f = 0; f < numFrames; f++) {
    if (rmsEnergy[f] * maxRms > onsetThreshold) {
      onsetFrame = f;
      consonantOnsetCandidateMs = Math.min(durationMs, f === 0 ? 0 : f * timeStepMs + frameDurationMs / 2);
      break;
    }
  }

  let vowelOnsetCandidateMs = consonantOnsetCandidateMs;
  let stableVowelFrames = 0;
  let vowelFound = false;
  for (let f = onsetFrame; f < numFrames - 5; f++) {
    const voicedLike = zeroCrossingRate[f] < 0.2 && spectralCentroid[f] < 5000;
    if (hasSignal && rmsEnergy[f] > 0.2 && voicedLike) {
      stableVowelFrames++;
      if (stableVowelFrames >= 2) {
        vowelOnsetCandidateMs = Math.min(durationMs, Math.max(consonantOnsetCandidateMs, (f - 1) * timeStepMs));
        vowelFound = true;
        break;
      }
    } else {
      stableVowelFrames = 0;
    }
  }
  if (hasSignal && !vowelFound) {
    vowelOnsetCandidateMs = Math.min(durationMs, consonantOnsetCandidateMs + Math.min(80, Math.max(5, durationMs - consonantOnsetCandidateMs)));
  }

  let decayOffsetCandidateMs = hasSignal ? durationMs : 0;
  for (let f = numFrames - 1; f >= 0; f--) {
    if (rmsEnergy[f] * maxRms > decayThreshold) {
      decayOffsetCandidateMs = Math.min(durationMs, f * timeStepMs + frameDurationMs / 2);
      break;
    }
  }

  return {
    timeStepMs,
    durationMs,
    hasSignal,
    rmsEnergy,
    zeroCrossingRate,
    spectralCentroid,
    f0Contour,
    silenceThreshold: hasSignal ? onsetThreshold / maxRms : 0,
    vowelOnsetCandidateMs,
    consonantOnsetCandidateMs,
    decayOffsetCandidateMs,
  };
}

function computeSpectralCentroid(real: Float32Array, imag: Float32Array, sampleRate: number): number {
  fftTransform(real, imag);
  const length = real.length;
  let weightedFrequency = 0;
  let magnitudeSum = 0;
  for (let bin = 1; bin < length / 2; bin++) {
    const magnitude = Math.hypot(real[bin], imag[bin]);
    weightedFrequency += (bin * sampleRate / length) * magnitude;
    magnitudeSum += magnitude;
  }
  return magnitudeSum > 0 ? weightedFrequency / magnitudeSum : 0;
}

function fftTransform(real: Float32Array, imag: Float32Array): void {
  const length = real.length;
  for (let i = 1, j = 0; i < length; i++) {
    let bit = length >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let size = 2; size <= length; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let weightReal = 1;
      let weightImag = 0;
      const halfSize = size >> 1;
      for (let offset = 0; offset < halfSize; offset++) {
        const even = start + offset;
        const odd = even + halfSize;
        const oddReal = real[odd] * weightReal - imag[odd] * weightImag;
        const oddImag = real[odd] * weightImag + imag[odd] * weightReal;
        real[odd] = real[even] - oddReal;
        imag[odd] = imag[even] - oddImag;
        real[even] += oddReal;
        imag[even] += oddImag;
        const nextWeightReal = weightReal * stepReal - weightImag * stepImag;
        weightImag = weightReal * stepImag + weightImag * stepReal;
        weightReal = nextWeightReal;
      }
    }
  }
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
      const s1 = data[start + i] || 0;
      const s2 = data[start + i + lag] || 0;
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
  const fftReal = new Float32Array(fftSize);
  const fftImag = new Float32Array(fftSize);

  // Windowing function (Hann)
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  for (let x = 0; x < width; x++) {
    const centerSample = Math.floor((x / width) * totalSamples);
    const startSample = Math.max(0, Math.min(totalSamples - fftSize, centerSample - halfFft));

    for (let n = 0; n < fftSize; n++) {
      fftReal[n] = (channelData[startSample + n] || 0) * hann[n];
      fftImag[n] = 0;
    }
    fftTransform(fftReal, fftImag);

    for (let y = 0; y < height; y++) {
      // Invert y so 0Hz is at bottom
      const freqBin = Math.min(halfFft - 1, Math.floor(((height - 1 - y) / height) * halfFft));
      const magnitude = Math.hypot(fftReal[freqBin], fftImag[freqBin]) / fftSize;
      const normMag = Math.min(1, Math.log1p(magnitude * 32) / Math.log(17));

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
