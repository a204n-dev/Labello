import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Volume2, 
  Scissors,
  Check
} from 'lucide-react';
import { AudioFileItem, OtoParameters, DiffSingerPhoneme, WorkstationMode } from '../types/workstation';
import { WorkstationAudioPlayer } from '../services/dsp/audioUtils';
import { computeSpectrogramCanvasData } from '../services/dsp/spectralAnalysis';

interface WaveformWorkspaceProps {
  activeFile: AudioFileItem | null;
  mode: WorkstationMode;
  enableSpectrogram: boolean;
  selectedPhonemeId: string | null;
  onSelectPhoneme: (id: string | null) => void;
  onUpdateOto: (oto: OtoParameters) => void;
  onUpdatePhoneme: (phonemeId: string, startMs: number, endMs: number) => void;
  onSplitPhoneme?: (phonemeId: string, splitAtMs: number) => void;
  onAcceptRegion?: () => void;
}

type DragTarget = 
  | { type: 'oto_offset' }
  | { type: 'oto_overlap' }
  | { type: 'oto_preutterance' }
  | { type: 'oto_fixed' }
  | { type: 'oto_cutoff' }
  | { type: 'phoneme_boundary'; phonemeId: string; edge: 'start' | 'end' }
  | null;

export const WaveformWorkspace: React.FC<WaveformWorkspaceProps> = ({
  activeFile,
  mode,
  enableSpectrogram,
  selectedPhonemeId,
  onSelectPhoneme,
  onUpdateOto,
  onUpdatePhoneme,
  onSplitPhoneme,
  onAcceptRegion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectroCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<WorkstationAudioPlayer>(new WorkstationAudioPlayer());

  const [zoom, setZoom] = useState<number>(1); // 1 = fit, >1 = zoomed in
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);

  const durationMs = activeFile?.durationMs || 1000;

  // Audio Playback
  const handleTogglePlay = useCallback(() => {
    if (!activeFile?.audioBuffer) return;
    const player = playerRef.current;

    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else {
      player.play(
        activeFile.audioBuffer,
        currentTimeMs,
        undefined,
        (timeMs) => setCurrentTimeMs(timeMs),
        () => setIsPlaying(false)
      );
      setIsPlaying(true);
    }
  }, [activeFile, isPlaying, currentTimeMs]);

  // Audition specific OTO region (from Offset to Cutoff)
  const handleAuditionOto = () => {
    if (!activeFile?.audioBuffer || !activeFile.oto) return;
    const player = playerRef.current;
    const { offsetMs, cutoffMs } = activeFile.oto;
    const endMs = cutoffMs < 0 ? durationMs + cutoffMs : offsetMs + cutoffMs;

    player.play(
      activeFile.audioBuffer,
      offsetMs,
      Math.max(offsetMs + 50, endMs),
      (t) => setCurrentTimeMs(t),
      () => setIsPlaying(false)
    );
    setIsPlaying(true);
  };

  // Keyboard Shortcuts (Space, Ctrl+Z, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when focused in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'a' || e.key === 'A') {
        if (onAcceptRegion) {
          e.preventDefault();
          onAcceptRegion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, onAcceptRegion]);

  // Stop playback when active file changes
  useEffect(() => {
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setZoom(1);
  }, [activeFile?.id]);

  // Render Spectrogram on Offscreen / Spectrogram Canvas
  useEffect(() => {
    if (!enableSpectrogram || !activeFile?.audioBuffer || !spectroCanvasRef.current) return;
    const canvas = spectroCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = computeSpectrogramCanvasData(activeFile.audioBuffer, width, height);
    ctx.putImageData(imgData, 0, 0);
  }, [enableSpectrogram, activeFile]);

  // Render Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFile?.waveformPeaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines (every 100ms / 500ms)
    const pxPerMs = width / durationMs;
    const stepMs = durationMs > 5000 ? 500 : 100;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let t = 0; t <= durationMs; t += stepMs) {
      const x = t * pxPerMs;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw Centerline
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw Waveform Peaks
    const peaks = activeFile.waveformPeaks;
    const numPoints = peaks.length / 2;

    ctx.fillStyle = enableSpectrogram ? 'rgba(129, 140, 248, 0.65)' : '#6366f1';
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const x = (i / numPoints) * width;
      const minVal = peaks[i * 2];
      const maxVal = peaks[i * 2 + 1];

      const yTop = midY - maxVal * (height * 0.44);
      const yBottom = midY - minVal * (height * 0.44);

      ctx.rect(x, yTop, Math.max(1, width / numPoints), Math.max(1, yBottom - yTop));
    }
    ctx.fill();
  }, [activeFile, durationMs, enableSpectrogram, zoom]);

  // Conversion helpers: milliseconds <-> canvas pixels
  const getCanvasWidth = () => {
    if (!containerRef.current) return 800;
    return containerRef.current.clientWidth * zoom;
  };

  const msToPx = (ms: number): number => {
    const totalW = getCanvasWidth();
    return (ms / durationMs) * totalW;
  };

  const pxToMs = (px: number): number => {
    const totalW = getCanvasWidth();
    return Math.max(0, Math.min(durationMs, (px / totalW) * durationMs));
  };

  // Mouse & Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeFile) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const clickMs = pxToMs(clickX);

    // Check hit tests for UTAU handles
    if (mode === 'utau' && activeFile.oto) {
      const { offsetMs, overlapMs, preutteranceMs, fixedMs, cutoffMs } = activeFile.oto;
      const cutoffAbsMs = cutoffMs < 0 ? durationMs + cutoffMs : offsetMs + cutoffMs;
      const preutAbsMs = offsetMs + preutteranceMs;
      const overlapAbsMs = offsetMs + overlapMs;
      const fixedAbsMs = offsetMs + fixedMs;

      const hitDist = 8; // pixel threshold

      if (Math.abs(clickX - msToPx(offsetMs)) < hitDist) {
        setDragTarget({ type: 'oto_offset' });
        return;
      }
      if (Math.abs(clickX - msToPx(overlapAbsMs)) < hitDist) {
        setDragTarget({ type: 'oto_overlap' });
        return;
      }
      if (Math.abs(clickX - msToPx(preutAbsMs)) < hitDist) {
        setDragTarget({ type: 'oto_preutterance' });
        return;
      }
      if (Math.abs(clickX - msToPx(fixedAbsMs)) < hitDist) {
        setDragTarget({ type: 'oto_fixed' });
        return;
      }
      if (Math.abs(clickX - msToPx(cutoffAbsMs)) < hitDist) {
        setDragTarget({ type: 'oto_cutoff' });
        return;
      }
    } else if (mode === 'diffsinger' && activeFile.phonemes) {
      // Check phoneme boundary hits
      for (const p of activeFile.phonemes) {
        if (Math.abs(clickX - msToPx(p.startMs)) < 6) {
          setDragTarget({ type: 'phoneme_boundary', phonemeId: p.id, edge: 'start' });
          onSelectPhoneme(p.id);
          return;
        }
        if (Math.abs(clickX - msToPx(p.endMs)) < 6) {
          setDragTarget({ type: 'phoneme_boundary', phonemeId: p.id, edge: 'end' });
          onSelectPhoneme(p.id);
          return;
        }
      }
    }

    // Otherwise scrub playhead
    setCurrentTimeMs(clickMs);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeFile) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseMs = pxToMs(mouseX);
    setHoverTimeMs(mouseMs);

    if (!dragTarget) return;

    if (mode === 'utau' && activeFile.oto) {
      const oto = { ...activeFile.oto };
      if (dragTarget.type === 'oto_offset') {
        oto.offsetMs = Math.round(Math.max(0, Math.min(mouseMs, durationMs - 50)));
      } else if (dragTarget.type === 'oto_overlap') {
        oto.overlapMs = Math.round(Math.max(0, mouseMs - oto.offsetMs));
      } else if (dragTarget.type === 'oto_preutterance') {
        oto.preutteranceMs = Math.round(Math.max(5, mouseMs - oto.offsetMs));
      } else if (dragTarget.type === 'oto_fixed') {
        oto.fixedMs = Math.round(Math.max(oto.preutteranceMs, mouseMs - oto.offsetMs));
      } else if (dragTarget.type === 'oto_cutoff') {
        // Cutoff as negative distance from end
        oto.cutoffMs = -Math.round(Math.max(10, durationMs - mouseMs));
      }
      onUpdateOto(oto);
    } else if (mode === 'diffsinger' && dragTarget.type === 'phoneme_boundary') {
      const p = activeFile.phonemes?.find(item => item.id === dragTarget.phonemeId);
      if (p) {
        if (dragTarget.edge === 'start') {
          onUpdatePhoneme(p.id, Math.round(Math.min(mouseMs, p.endMs - 10)), p.endMs);
        } else {
          onUpdatePhoneme(p.id, p.startMs, Math.round(Math.max(mouseMs, p.startMs + 10)));
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDragTarget(null);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <Volume2 className="w-12 h-12 mb-3 text-slate-700" />
        <p className="text-sm font-medium">Select or import an audio file to begin labeling</p>
      </div>
    );
  }

  const oto = activeFile.oto;
  const canvasWidth = getCanvasWidth();
  const canvasHeight = enableSpectrogram ? 220 : 160;

  // Calculate UTAU Visual Zones
  const offsetPx = oto ? msToPx(oto.offsetMs) : 0;
  const overlapPx = oto ? msToPx(oto.offsetMs + oto.overlapMs) : 0;
  const preutPx = oto ? msToPx(oto.offsetMs + oto.preutteranceMs) : 0;
  const fixedPx = oto ? msToPx(oto.offsetMs + oto.fixedMs) : 0;
  const cutoffPx = oto 
    ? (oto.cutoffMs < 0 ? msToPx(durationMs + oto.cutoffMs) : msToPx(oto.offsetMs + oto.cutoffMs))
    : canvasWidth;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-900 overflow-hidden select-none">
      {/* Waveform Canvas & Ruler Stage */}
      <div 
        ref={containerRef}
        id="waveform-stage-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-slate-950 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoverTimeMs(null); }}
      >
        <div style={{ width: `${canvasWidth}px`, height: '100%', position: 'relative' }}>
          
          {/* Time Ruler (Seconds / Milliseconds) */}
          <div className="h-6 w-full border-b border-slate-800 bg-slate-900/90 flex items-center text-[10px] font-mono text-slate-500 px-2 pointer-events-none sticky top-0 z-20">
            {Array.from({ length: Math.ceil(durationMs / 200) + 1 }).map((_, i) => {
              const ms = i * 200;
              const x = msToPx(ms);
              return (
                <div key={i} className="absolute" style={{ left: `${x}px` }}>
                  <div className="h-2 w-[1px] bg-slate-700 -mt-1" />
                  <span className="ml-1 text-[9px] text-slate-400">{(ms / 1000).toFixed(2)}s</span>
                </div>
              );
            })}
          </div>

          {/* Canvas Wrapper */}
          <div className="relative mt-2" style={{ height: `${canvasHeight}px` }}>
            {/* Optional Spectrogram Canvas */}
            {enableSpectrogram && (
              <canvas
                ref={spectroCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
              />
            )}

            {/* Main Waveform Canvas */}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* UTAU VLabeler-style Visual Colored Regions */}
            {mode === 'utau' && oto && (
              <>
                {/* Blanked Left Zone (Before Offset) */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none"
                  style={{ width: `${offsetPx}px` }}
                />

                {/* Overlap Zone (Between Offset and Overlap) */}
                <div 
                  className="absolute top-0 bottom-0 bg-emerald-500/15 border-r border-dashed border-emerald-400/80 pointer-events-none"
                  style={{ left: `${offsetPx}px`, width: `${Math.max(0, overlapPx - offsetPx)}px` }}
                />

                {/* Consonant Zone (Between Overlap and Preutterance) */}
                <div 
                  className="absolute top-0 bottom-0 bg-rose-500/10 pointer-events-none"
                  style={{ left: `${overlapPx}px`, width: `${Math.max(0, preutPx - overlapPx)}px` }}
                />

                {/* Fixed Consonant Zone (Between Preutterance and Fixed) */}
                <div 
                  className="absolute top-0 bottom-0 bg-pink-500/15 pointer-events-none"
                  style={{ left: `${preutPx}px`, width: `${Math.max(0, fixedPx - preutPx)}px` }}
                />

                {/* Blanked Right Zone (After Cutoff) */}
                <div 
                  className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none"
                  style={{ left: `${cutoffPx}px` }}
                />

                {/* Offset Line Handle (Blue) */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-blue-500 cursor-ew-resize group z-10"
                  style={{ left: `${offsetPx}px` }}
                >
                  <div className="absolute top-1 -left-2 bg-blue-600 text-[10px] font-mono px-1 rounded text-white shadow">
                    Offset ({oto.offsetMs}ms)
                  </div>
                </div>

                {/* Overlap Line Handle (Green) */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 cursor-ew-resize group z-10"
                  style={{ left: `${overlapPx}px` }}
                >
                  <div className="absolute top-6 -left-2 bg-emerald-600 text-[10px] font-mono px-1 rounded text-white shadow">
                    Overlap (+{oto.overlapMs}ms)
                  </div>
                </div>

                {/* Preutterance Line Handle (Red) */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-rose-500 cursor-ew-resize group z-10"
                  style={{ left: `${preutPx}px` }}
                >
                  <div className="absolute top-11 -left-2 bg-rose-600 text-[10px] font-mono px-1 rounded text-white shadow font-bold">
                    Preut (+{oto.preutteranceMs}ms)
                  </div>
                </div>

                {/* Fixed Consonant Handle (Pink) */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-pink-500 cursor-ew-resize group z-10"
                  style={{ left: `${fixedPx}px` }}
                >
                  <div className="absolute top-16 -left-2 bg-pink-600 text-[10px] font-mono px-1 rounded text-white shadow">
                    Fixed (+{oto.fixedMs}ms)
                  </div>
                </div>

                {/* Cutoff Handle (Indigo) */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-indigo-400 cursor-ew-resize group z-10"
                  style={{ left: `${cutoffPx}px` }}
                >
                  <div className="absolute top-1 -right-2 bg-indigo-600 text-[10px] font-mono px-1 rounded text-white shadow">
                    Cutoff ({oto.cutoffMs}ms)
                  </div>
                </div>
              </>
            )}

            {/* DiffSinger Phoneme Region Markers */}
            {mode === 'diffsinger' && activeFile.phonemes && (
              <div className="absolute inset-0 pointer-events-none">
                {activeFile.phonemes.map((p) => {
                  const startX = msToPx(p.startMs);
                  const endX = msToPx(p.endMs);
                  const widthPx = Math.max(12, endX - startX);
                  const isSelected = p.id === selectedPhonemeId;

                  const isHigh = p.confidence >= 90;
                  const isMedium = p.confidence >= 70 && p.confidence < 90;

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPhoneme(p.id)}
                      className={`absolute top-0 bottom-0 pointer-events-auto border-r border-slate-700 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/25 border-indigo-400'
                          : isHigh
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
                          : isMedium
                          ? 'bg-amber-500/10 hover:bg-amber-500/20'
                          : 'bg-rose-500/15 hover:bg-rose-500/25'
                      }`}
                      style={{ left: `${startX}px`, width: `${widthPx}px` }}
                    >
                      {/* Phoneme Label Tag */}
                      <div className="p-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-xs text-white bg-slate-900/80 px-1 py-0.5 rounded">
                            {p.phoneme}
                          </span>
                          {p.pitchNote && (
                            <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950/80 px-1 rounded">
                              {p.pitchNote}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-mono font-semibold px-1 rounded w-fit ${
                            isHigh
                              ? 'text-emerald-300 bg-emerald-950/80'
                              : isMedium
                              ? 'text-amber-300 bg-amber-950/80'
                              : 'text-rose-300 bg-rose-950/80'
                          }`}
                        >
                          {p.confidence}%
                        </span>
                      </div>

                      {/* Boundary splitter handles */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                        title="Drag to adjust boundary"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Playhead Marker */}
            <div 
              className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              style={{ left: `${msToPx(currentTimeMs)}px` }}
            >
              <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -ml-1 -mt-1 shadow" />
            </div>

            {/* Mouse Hover Guide */}
            {hoverTimeMs !== null && (
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-slate-500/40 pointer-events-none z-10"
                style={{ left: `${msToPx(hoverTimeMs)}px` }}
              >
                <div className="absolute bottom-1 left-1 bg-slate-900/90 text-slate-300 text-[9px] font-mono px-1 rounded">
                  {Math.round(hoverTimeMs)}ms
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Transport & Workspace Controls */}
      <div className="h-12 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-2">
          {/* Play / Pause */}
          <button
            id="play-pause-btn"
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Stop / Reset Playhead */}
          <button
            id="stop-audio-btn"
            onClick={() => {
              playerRef.current.stop();
              setIsPlaying(false);
              setCurrentTimeMs(0);
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            title="Stop and return to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Audition UTAU slice (Offset to Cutoff) */}
          {mode === 'utau' && (
            <button
              id="audition-oto-btn"
              onClick={handleAuditionOto}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-xs text-indigo-300 hover:text-indigo-200 font-medium transition-colors"
              title="Play active OTO slice"
            >
              Audition OTO
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Timecode display */}
          <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <span>{(currentTimeMs / 1000).toFixed(3)}s</span> / <span>{(durationMs / 1000).toFixed(3)}s</span>
          </div>
        </div>

        {/* Zoom & View Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <button
              id="zoom-out-btn"
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono text-slate-400 font-medium">
              {zoom.toFixed(1)}x
            </span>
            <button
              id="zoom-in-btn"
              onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            id="zoom-fit-btn"
            onClick={() => setZoom(1)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 text-xs"
            title="Reset Zoom / Fit"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
