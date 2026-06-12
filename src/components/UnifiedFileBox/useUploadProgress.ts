import { useEffect, useRef, useState } from 'react';
import { formatTimeRemaining } from '../../utils/format';
import { useTranslation } from '../../i18n';

export interface ProgressInput {
  id: string;
  fileName: string;
  fileSize: number;
  loadedBytes: number;
  completed: boolean;
}

export interface ProgressRow extends ProgressInput {
  progress: number;
  timeRemaining: string;
}

interface Sample {
  time: number;
  bytes: number;
}

const SPEED_WINDOW_MS = 5000;
const MIN_SAMPLES = 4;
const MIN_PROGRESS = 0.02;

const pct = (loaded: number, size: number) =>
  size > 0 ? Math.min(Math.round((loaded / size) * 100), 100) : 0;

const estimate = (samples: Sample[], size: number, loaded: number, lang: 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW'): string => {
  if (samples.length >= MIN_SAMPLES && loaded >= size * MIN_PROGRESS) {
    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    const dt = newest.time - oldest.time;
    const db = newest.bytes - oldest.bytes;
    if (dt > 0 && db > 0) {
      const remainingSeconds = (size - loaded) / (db / dt) / 1000;
      return formatTimeRemaining(remainingSeconds, lang);
    }
  }
  return formatTimeRemaining(Infinity, lang);
};

export const useUploadProgress = (items: ProgressInput[]) => {
  const { language } = useTranslation();
  const langRef = useRef(language);
  langRef.current = language;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fileSamplesRef = useRef<Map<string, Sample[]>>(new Map());
  const filePeakRef = useRef<Map<string, number>>(new Map());
  const overallSamplesRef = useRef<Sample[]>([]);
  const overallPeakRef = useRef(0);

  const [etas, setEtas] = useState<Map<string, string>>(new Map());
  const [overallEta, setOverallEta] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const its = itemsRef.current;
      const lang = langRef.current;
      const cutoff = now - SPEED_WINDOW_MS;
      const newEtas = new Map<string, string>();
      let totalLoaded = 0;
      let totalSize = 0;

      for (const it of its) {
        const peak = Math.max(it.loadedBytes, filePeakRef.current.get(it.id) || 0);
        filePeakRef.current.set(it.id, peak);
        totalSize += it.fileSize;
        totalLoaded += Math.min(peak, it.fileSize);
        if (it.completed) {
          newEtas.set(it.id, '');
          continue;
        }
        const samples = (fileSamplesRef.current.get(it.id) || []).filter((s) => s.time >= cutoff);
        samples.push({ time: now, bytes: peak });
        fileSamplesRef.current.set(it.id, samples);
        newEtas.set(it.id, estimate(samples, it.fileSize, peak, lang));
      }
      setEtas(newEtas);

      const overallPeak = Math.max(totalLoaded, overallPeakRef.current);
      overallPeakRef.current = overallPeak;
      const overallSamples = overallSamplesRef.current.filter((s) => s.time >= cutoff);
      overallSamples.push({ time: now, bytes: overallPeak });
      overallSamplesRef.current = overallSamples;
      const allDone = its.length > 0 && its.every((i) => i.completed);
      setOverallEta(allDone ? '' : estimate(overallSamples, totalSize, overallPeak, lang));
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const rows: ProgressRow[] = items.map((it) => ({
    ...it,
    progress: pct(it.loadedBytes, it.fileSize),
    timeRemaining: it.completed ? '' : etas.get(it.id) || '',
  }));

  const totalSize = items.reduce((s, i) => s + i.fileSize, 0);
  const totalLoaded = items.reduce((s, i) => s + Math.min(i.loadedBytes, i.fileSize), 0);

  return {
    rows,
    overall: { progress: pct(totalLoaded, totalSize), timeRemaining: overallEta },
  };
};
