import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

export function useToneContextSwitcher(options = {}) {
  const [toneReady, setToneReady] = useState(false);
  const [transport, setTransport] = useState(null);
  const prevContextRef = useRef(null);

  useEffect(() => {
    const rawCtx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: options.latencyHint || 'balanced',
      sampleRate: options.sampleRate || 24000,
    });

    const toneCtx = new Tone.Context(rawCtx);
    Tone.setContext(toneCtx);

    // Close previous context if it exists
    if (prevContextRef.current) {
      try {
        prevContextRef.current.close();
      } catch (err) {
        console.warn('Previous context already closed:', err);
      }
    }

    prevContextRef.current = rawCtx;
    setTransport(Tone.Transport);
    setToneReady(true);
  }, [options.latencyHint, options.sampleRate]);

  return { toneReady, transport, context: Tone.getContext() };
}
