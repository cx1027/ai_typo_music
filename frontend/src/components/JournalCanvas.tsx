"use client";

import { useEffect, useRef, useCallback } from "react";

interface Word {
  char: string;
  angle: number;
  radius: number;
  baseRadius: number;
  speed: number;
  amplitude: number;
  phase: number;
  opacity: number;
  size: number;
  color: string;
}

interface FloatingCanvasProps {
  words: string[];
  progress: number;
  fontFamily?: string;
  textColor?: string;
}

export function JournalCanvas({
  words,
  progress,
  fontFamily = "var(--font-caveat), 'Caveat', cursive",
  textColor = "#a855f7",
}: FloatingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<Word[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const initWords = useCallback(
    (width: number, height: number) => {
      const allChars = words.join(" ").split("").filter(Boolean);
      if (!allChars.length) return;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseR = Math.min(width, height) * 0.32;

      wordsRef.current = allChars.map((char, i) => ({
        char,
        angle: (i / allChars.length) * Math.PI * 2,
        radius: baseR,
        baseRadius: baseR,
        speed: 0.08 + Math.random() * 0.12,
        amplitude: 3 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.5,
        size: 16 + Math.random() * 8,
        color: textColor,
      }));
    },
    [words, textColor]
  );

  const animate = useCallback(
    (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
      ctx.fillRect(0, 0, width, height);

      wordsRef.current.forEach((word) => {
        word.angle += word.speed * 0.016;

        const drift =
          Math.sin(timeRef.current * 0.001 + word.phase) * word.amplitude;
        const r =
          word.baseRadius +
          drift +
          progress * Math.min(width, height) * 0.08;

        const x = cx + r * Math.cos(word.angle);
        const y = cy + r * Math.sin(word.angle);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(word.angle + Math.PI / 2);

        ctx.font = `${word.size}px ${fontFamily}`;
        ctx.fillStyle = word.color;
        ctx.globalAlpha = word.opacity * (0.4 + progress * 0.6);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(word.char, 0, 0);

        ctx.restore();
      });

      timeRef.current = ts;
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [fontFamily, progress]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    initWords(rect.width, rect.height);

    const ic = canvas.getContext("2d");
    if (ic) {
      ic.fillStyle = "#0a0a0f";
      ic.fillRect(0, 0, rect.width, rect.height);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animate, initWords]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ width: "100%", height: "100%" }}
      aria-label="Floating mood words animation"
    />
  );
}
