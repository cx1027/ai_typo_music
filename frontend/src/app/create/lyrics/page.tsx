"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JournalCanvas } from "@/components/JournalCanvas";
import { CircularProgress } from "@/components/CircularProgress";
import { generateLyrics } from "@/lib/api";

type Stage = "loading" | "editing" | "submitting";

function LyricsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const words = searchParams.get("words") || "";

  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState(0);
  const [lyrics, setLyrics] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Animate progress bar with easing
  useEffect(() => {
    if (stage !== "loading") return;
    const animate = () => {
      targetRef.current = Math.min(
        targetRef.current + 0.008 + Math.random() * 0.012,
        1
      );
      setProgress((prev) => prev + (targetRef.current - prev) * 0.06);
      if (targetRef.current < 0.99) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(1);
      }
    };
    const id = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 600);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(id);
    };
  }, [stage]);

  // Generate lyrics once page loads
  useEffect(() => {
    if (!words) {
      router.replace("/create");
      return;
    }

    const fetchLyrics = async () => {
      try {
        const result = await generateLyrics(words);
        if (result.error) {
          setError(result.error);
        } else {
          setLyrics(result.lyrics || "");
          setCaption(result.caption || words);
        }
      } catch {
        setError("Failed to generate lyrics. Please try again.");
      } finally {
        setProgress(1);
      }
    };

    const id = setTimeout(fetchLyrics, 1200);
    return () => clearTimeout(id);
  }, [words, router]);

  // Transition to editing once progress reaches near 1
  useEffect(() => {
    if (stage === "loading" && progress >= 0.98) {
      const id = setTimeout(() => setStage("editing"), 500);
      return () => clearTimeout(id);
    }
  }, [progress, stage]);

  const handleFinished = useCallback(() => {
    if (!lyrics.trim()) return;
    setStage("submitting");

    const title = caption || words;
    const params = new URLSearchParams({
      words,
      lyrics,
      caption: title,
    });
    router.push(`/create/result?${params.toString()}`);
  }, [lyrics, caption, words, router]);

  const canvasWords = lyrics
    ? lyrics.split(/[\s\n]+/).filter((w) => w.length > 1).slice(0, 30)
    : words.split(",").map((w) => w.trim()).filter(Boolean);

  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Canvas floating words */}
      <div className="absolute inset-0 z-0">
        <JournalCanvas words={canvasWords} progress={progress} />
      </div>

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Stage: loading */}
        {stage === "loading" && (
          <div className="flex flex-col items-center gap-8">
            <CircularProgress progress={progress} size={140} />
            <div className="flex flex-col items-center gap-2">
              <p
                className="text-sm uppercase tracking-[0.3em]"
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-caveat), cursive",
                  letterSpacing: "0.2em",
                }}
              >
                {error ? "Error" : "Generating lyrics"}
              </p>
              {error && (
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stage: editing */}
        {stage === "editing" && (
          <div className="flex flex-col items-center gap-6 max-w-lg w-full px-4">
            <p
              className="text-2xl text-center"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-caveat), cursive",
              }}
            >
              Your lyrics are ready
            </p>

            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="input-base w-full min-h-[280px]"
              style={{ background: "rgba(19,19,26,0.85)", backdropFilter: "blur(8px)" }}
              placeholder="Your generated lyrics will appear here..."
            />

            <div className="flex gap-4">
              <button
                onClick={() => setLyrics("")}
                className="btn-secondary"
              >
                Clear
              </button>
              <button
                onClick={handleFinished}
                className="btn-primary px-10"
                disabled={!lyrics.trim()}
              >
                Finished
              </button>
            </div>
          </div>
        )}

        {/* Stage: submitting */}
        {stage === "submitting" && (
          <div className="flex flex-col items-center gap-6">
            <CircularProgress progress={0.1} size={100} />
            <p
              className="text-sm uppercase tracking-widest"
              style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
            >
              Starting generation...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LyricsPage() {
  return (
    <Suspense fallback={
      <main className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </main>
    }>
      <LyricsContent />
    </Suspense>
  );
}
