import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  Repeat,
  Crosshair,
} from 'lucide-react';
import { AudioFileItem, OtoParameters, WorkstationMode } from '../types/workstation';
import { AudioEngine } from '../services/audio/audioEngine';
import { clampMs, formatTimecode, normalizeSelection } from '../services/audio/timeUtils';
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
  | { type: 'select'; anchorMs: number }
  | null;

export const WaveformWorkspace: React.FC<WaveformWorkspaceProps> = ({
  activeFile,
  mode,
  enableSpectrogram,
  selectedPhonemeId,
  onSelectPhoneme,
  onUpdateOto,
  onUpdatePhoneme,
  onAcceptRegion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectroCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  const [zoom, setZoom] = useState<number>(1); // 1 = fit, >1 = zoomed in
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ startMs: number; endMs: number } | null>(null);
  const [loopSelection, setLoopSelection] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);

  const durationMs = activeFile?.durationMs || 1000;

  // ---- Engine wiring: load buffer when file changes, subscribe to ticks ----
  useEffect(() => {
    engine.onTimeUpdate((ms) => setCurrentTimeMs(Math.round(ms)));
    engine.onPlaybackEnded(() => {
      setIsPlaying(false);
      setIsPaused(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTimeMs(0);
    setSelection(null);
    setLoopSelection(false);
    setZoom(1);
    if (activeFile?.audioBuffer) {
      try {
        engine.load(activeFile.audioBuffer);
      } catch (err) {
        console.error('AudioEngine load failed:', err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.id]);

  // Keep engine volume in sync
  useEffect(() => {
    engine.setVolume(volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // ---- Transport ----
  const handlePlay = useCallback(() => {
    if (!activeFile?.audioBuffer) return;
    if (!engineRef.current) return;
    const eng = engineRef.current;
    // If a selection exists and playhead is outside it, offer play-from-cursor;
    // plain Play always plays from cursor to end.
    eng.clearLoop();
    eng.play(Math.round(currentTimeMs));
    setIsPlaying(true);
    setIsPaused(false);
  }, [activeFile, currentTimeMs]);

  const handlePause = useCallback(() => {
    engine.pause();
    setIsPlaying(false);
    setIsPaused(true);
    setCurrentTimeMs(engine.position());
  }, [engine]);

  const handleStop = useCallback(() => {
    engine.clearLoop();
    engine.stop();
    setIsPlaying(false);
    setIsPaused(false);
  }, [engine]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) handlePause();
    else handlePlay();
  }, [isPlaying, handlePlay, handlePause]);

  const handlePlaySelection = useCallback(() => {
    if (!activeFile?.audioBuffer || !selection) return;
    const { startMs, endMs } = selection;
    if (endMs <= startMs) return;
    engine.playSelection(startMs, endMs, loopSelection);
    setIsPlaying(true);
    setIsPaused(false);
  }, [activeFile, selection, loopSelection, engine]);

  const handleSeek = useCallback(
    (ms: number) => {
      const target = clampMs(ms, durationMs);
      engine.seek(Math.round(target));
      setCurrentTimeMs(Math.round(target));
    },
    [durationMs, engine]
  );

  const handleZoomToSelection = useCallback(() => {
    if (!selection) return;
    const selLen = selection.endMs - selection.startMs;
    if (selLen <= 0) return;
    // zoom so selection fills ~80% of viewport width
    const targetZoom = Math.min(8, Math.max(1, (durationMs / selLen) * 0.8));
    setZoom(targetZoom);
    // scroll so selection start is visible
    requestAnimationFrame(() => {
      const c = containerRef.current;
      if (!c) return;
      const totalW = c.clientWidth * targetZoom;
      const x = (selection.startMs / durationMs) * totalW;
      c.scrollLeft = Math.max(0, x - c.clientWidth * 0.1);
    });
  }, [selection, durationMs]);

  // ---- Keyboard shortcuts: Space, Home/End, Left/Right, Ctrl+wheel handled separately ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!activeFile) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleSeek(durationMs);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTimeMs - (e.shiftKey ? 100 : 10));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTimeMs + (e.shiftKey ? 100 : 10));
      } else if ((e.key === 'a' || e.key === 'A') && onAcceptRegion && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onAcceptRegion();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeFile, handleTogglePlay, handleSeek, currentTimeMs, durationMs, onAcceptRegion]);

  // Ctrl + wheel = zoom (non-passive listener so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const dir = e.deltaY > 0 ? -0.25 : 0.25;
        setZoom((z) => Math.min(8, Math.max(1, +(z + dir).toFixed(2))));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---- Spectrogram ----
  useEffect(() => {
    if (!enableSpectrogram || !activeFile?.audioBuffer || !spectroCanvasRef.current) return;
    const canvas = spectroCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const imgData = computeSpectrogramCanvasData(activeFile.audioBuffer, canvas.width, canvas.height);
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error('Spectrogram render failed:', err);
    }
  }, [enableSpectrogram, activeFile]);

  // ---- Waveform canvas ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFile?.waveformPeaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    ctx.clearRect(0, 0, width, height);
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
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
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

  // ---- ms <-> px ----
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

  // ---- Mouse: OTO handles > phoneme edges > selection-drag, click = seek ----
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeFile) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const clickMs = pxToMs(clickX);

    if (mode === 'utau' && activeFile.oto) {
      const { offsetMs, overlapMs, preutteranceMs, fixedMs, cutoffMs } = activeFile.oto;
      const cutoffAbsMs = cutoffMs < 0 ? durationMs + cutoffMs : offsetMs + cutoffMs;
      const preutAbsMs = offsetMs + preutteranceMs;
      const overlapAbsMs = offsetMs + overlapMs;
      const fixedAbsMs = offsetMs + fixedMs;
      const hitDist = 8;
      if (Math.abs(clickX - msToPx(offsetMs)) < hitDist) { setDragTarget({ type: 'oto_offset' }); return; }
      if (Math.abs(clickX - msToPx(overlapAbsMs)) < hitDist) { setDragTarget({ type: 'oto_overlap' }); return; }
      if (Math.abs(clickX - msToPx(preutAbsMs)) < hitDist) { setDragTarget({ type: 'oto_preutterance' }); return; }
      if (Math.abs(clickX - msToPx(fixedAbsMs)) < hitDist) { setDragTarget({ type: 'oto_fixed' }); return; }
      if (Math.abs(clickX - msToPx(cutoffAbsMs)) < hitDist) { setDragTarget({ type: 'oto_cutoff' }); return; }
    } else if (mode === 'diffsinger' && activeFile.phonemes) {
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
    // Begin selection-drag; a plain click (no move) becomes a seek on mouse-up
    setDragTarget({ type: 'select', anchorMs: clickMs });
    setSelection({ startMs: Math.round(clickMs), endMs: Math.round(clickMs) });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeFile) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseMs = pxToMs(mouseX);
    setHoverTimeMs(mouseMs);
    if (!dragTarget) return;

    if (dragTarget.type === 'select') {
      const norm = normalizeSelection(dragTarget.anchorMs, mouseMs, durationMs);
      setSelection({ startMs: norm.startMs, endMs: norm.endMs });
      return;
    }
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
        oto.cutoffMs = -Math.round(Math.max(10, durationMs - mouseMs));
      }
      onUpdateOto(oto);
    } else if (mode === 'diffsinger' && dragTarget.type === 'phoneme_boundary') {
      const p = activeFile.phonemes?.find((item) => item.id === dragTarget.phonemeId);
      if (p) {
        if (dragTarget.edge === 'start') onUpdatePhoneme(p.id, Math.round(Math.min(mouseMs, p.endMs - 10)), p.endMs);
        else onUpdatePhoneme(p.id, p.startMs, Math.round(Math.max(mouseMs, p.startMs + 10)));
      }
    }
  };

  const handleMouseUp = () => {
    if (dragTarget?.type === 'select' && selection) {
      if (selection.endMs - selection.startMs < 3) {
        // Treat as click: move playhead, clear tiny selection
        handleSeek(selection.startMs);
        setSelection(null);
      }
    }
    setDragTarget(null);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <Volume2 className="w-12 h-12 mb-3 text-slate-700" />
        <p className="text-sm font-medium">Select or import an audio file to begin labeling</p>
        <p className="text-xs mt-1 text-slate-600">File → Import Audio, or drag &amp; drop WAV / MP3 / FLAC / OGG</p>
      </div>
    );
  }

  const oto = activeFile.oto;
  const canvasWidth = getCanvasWidth();
  const canvasHeight = enableSpectrogram ? 220 : 160;
  const offsetPx = oto ? msToPx(oto.offsetMs) : 0;
  const overlapPx = oto ? msToPx(oto.offsetMs + oto.overlapMs) : 0;
  const preutPx = oto ? msToPx(oto.offsetMs + oto.preutteranceMs) : 0;
  const fixedPx = oto ? msToPx(oto.offsetMs + oto.fixedMs) : 0;
  const cutoffPx = oto
    ? oto.cutoffMs < 0
      ? msToPx(durationMs + oto.cutoffMs)
      : msToPx(oto.offsetMs + oto.cutoffMs)
    : canvasWidth;

  const selPx =
    selection && selection.endMs > selection.startMs
      ? { left: msToPx(selection.startMs), width: msToPx(selection.endMs) - msToPx(selection.startMs) }
      : null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-900 overflow-hidden select-none">
      {/* Selection info bar */}
      <div className="h-8 bg-slate-950 border-b border-slate-800 px-3 flex items-center gap-3 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1 text-slate-500">
          <Crosshair className="w-3 h-3" /> Selection
        </span>
        {selection && selection.endMs > selection.startMs ? (
          <>
            <span>Start <span className="text-slate-200">{formatTimecode(selection.startMs)}</span></span>
            <span>End <span className="text-slate-200">{formatTimecode(selection.endMs)}</span></span>
            <span>Duration <span className="text-indigo-300">{formatTimecode(selection.endMs - selection.startMs)}</span></span>
            <button onClick={handlePlaySelection} className="ml-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-sans font-semibold" title="Play selected region">
              Play Selection
            </button>
            <button onClick={handleZoomToSelection} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans" title="Zoom to selection">
              Zoom to Selection
            </button>
            <label className="flex items-center gap-1 cursor-pointer font-sans" title="Loop the selected region">
              <input type="checkbox" checked={loopSelection} onChange={(e) => setLoopSelection(e.target.checked)} className="accent-indigo-500" />
              <Repeat className="w-3 h-3" /> Loop
            </label>
            <button onClick={() => setSelection(null)} className="text-slate-500 hover:text-slate-300 font-sans">Clear</button>
          </>
        ) : (
          <span className="text-slate-600">Drag on the waveform to select a region • Click to move the playhead</span>
        )}
      </div>

      {/* Waveform stage */}
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

          <div className="relative mt-2" style={{ height: `${canvasHeight}px` }}>
            {enableSpectrogram && (
              <canvas ref={spectroCanvasRef} width={canvasWidth} height={canvasHeight} className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" />
            )}
            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Selection overlay */}
            {selPx && (
              <div className="absolute top-0 bottom-0 bg-indigo-500/20 border-x border-indigo-400/70 pointer-events-none z-10" style={{ left: `${selPx.left}px`, width: `${selPx.width}px` }} />
            )}

            {mode === 'utau' && oto && (
              <>
                <div className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none" style={{ width: `${offsetPx}px` }} />
                <div className="absolute top-0 bottom-0 bg-emerald-500/15 border-r border-dashed border-emerald-400/80 pointer-events-none" style={{ left: `${offsetPx}px`, width: `${Math.max(0, overlapPx - offsetPx)}px` }} />
                <div className="absolute top-0 bottom-0 bg-rose-500/10 pointer-events-none" style={{ left: `${overlapPx}px`, width: `${Math.max(0, preutPx - overlapPx)}px` }} />
                <div className="absolute top-0 bottom-0 bg-pink-500/15 pointer-events-none" style={{ left: `${preutPx}px`, width: `${Math.max(0, fixedPx - preutPx)}px` }} />
                <div className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none" style={{ left: `${cutoffPx}px` }} />
                <div className="absolute top-0 bottom-0 w-[2px] bg-blue-500 cursor-ew-resize z-10" style={{ left: `${offsetPx}px` }}>
                  <div className="absolute top-1 -left-2 bg-blue-600 text-[10px] font-mono px-1 rounded text-white shadow">Offset ({oto.offsetMs}ms)</div>
                </div>
                <div className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 cursor-ew-resize z-10" style={{ left: `${overlapPx}px` }}>
                  <div className="absolute top-6 -left-2 bg-emerald-600 text-[10px] font-mono px-1 rounded text-white shadow">Overlap (+{oto.overlapMs}ms)</div>
                </div>
                <div className="absolute top-0 bottom-0 w-[2px] bg-rose-500 cursor-ew-resize z-10" style={{ left: `${preutPx}px` }}>
                  <div className="absolute top-11 -left-2 bg-rose-600 text-[10px] font-mono px-1 rounded text-white shadow font-bold">Preut (+{oto.preutteranceMs}ms)</div>
                </div>
                <div className="absolute top-0 bottom-0 w-[2px] bg-pink-500 cursor-ew-resize z-10" style={{ left: `${fixedPx}px` }}>
                  <div className="absolute top-16 -left-2 bg-pink-600 text-[10px] font-mono px-1 rounded text-white shadow">Fixed (+{oto.fixedMs}ms)</div>
                </div>
                <div className="absolute top-0 bottom-0 w-[2px] bg-indigo-400 cursor-ew-resize z-10" style={{ left: `${cutoffPx}px` }}>
                  <div className="absolute top-1 -right-2 bg-indigo-600 text-[10px] font-mono px-1 rounded text-white shadow">Cutoff ({oto.cutoffMs}ms)</div>
                </div>
              </>
            )}

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
                        isSelected ? 'bg-indigo-600/25 border-indigo-400' : isHigh ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : isMedium ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-rose-500/15 hover:bg-rose-500/25'
                      }`}
                      style={{ left: `${startX}px`, width: `${widthPx}px` }}
                    >
                      <div className="p-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-xs text-white bg-slate-900/80 px-1 py-0.5 rounded">{p.phoneme}</span>
                          {p.pitchNote && <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950/80 px-1 rounded">{p.pitchNote}</span>}
                        </div>
                        <span className={`text-[9px] font-mono font-semibold px-1 rounded w-fit ${isHigh ? 'text-emerald-300 bg-emerald-950/80' : isMedium ? 'text-amber-300 bg-amber-950/80' : 'text-rose-300 bg-rose-950/80'}`}>{p.confidence}%</span>
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" title="Drag to adjust boundary" />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.6)]" style={{ left: `${msToPx(currentTimeMs)}px` }}>
              <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -ml-1 -mt-1 shadow" />
            </div>

            {hoverTimeMs !== null && (
              <div className="absolute top-0 bottom-0 w-[1px] bg-slate-500/40 pointer-events-none z-10" style={{ left: `${msToPx(hoverTimeMs)}px` }}>
                <div className="absolute bottom-1 left-1 bg-slate-900/90 text-slate-300 text-[9px] font-mono px-1 rounded">{Math.round(hoverTimeMs)}ms</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="min-h-12 bg-slate-950 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-slate-300 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button id="play-btn" onClick={handlePlay} disabled={isPlaying} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-md text-xs font-semibold shadow-sm transition-all" title="Play from cursor (Space)">
            <Play className="w-3.5 h-3.5" /><span>Play</span>
          </button>
          <button id="pause-btn" onClick={handlePause} disabled={!isPlaying} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-md text-xs font-semibold transition-all" title="Pause (Space)">
            <Pause className="w-3.5 h-3.5" /><span>Pause{isPaused ? 'd' : ''}</span>
          </button>
          <button id="stop-audio-btn" onClick={handleStop} className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors" title="Stop">
            <Square className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-800 mx-1" />
          <div className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800" title="Current position / total duration">
            <span>{formatTimecode(currentTimeMs)}</span> / <span>{formatTimecode(durationMs)}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400" title="Volume">
            <Volume2 className="w-3.5 h-3.5" />
            <input id="volume-slider" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-indigo-500" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden lg:block text-[10px] text-slate-600 font-mono">Space Play/Pause • Home/End • ←/→ ±10ms (Shift ±100ms) • Ctrl+Wheel Zoom</span>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <button id="zoom-out-btn" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))} className="p-1 text-slate-400 hover:text-slate-200 rounded" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="px-2 text-[11px] font-mono text-slate-400 font-medium">{zoom.toFixed(1)}x</span>
            <button id="zoom-in-btn" onClick={() => setZoom((z) => Math.min(8, +(z + 0.5).toFixed(2)))} className="p-1 text-slate-400 hover:text-slate-200 rounded" title="Zoom In (or Ctrl+Wheel)"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
          <button id="zoom-fit-btn" onClick={() => setZoom(1)} className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 text-xs" title="Fit entire audio"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
};
