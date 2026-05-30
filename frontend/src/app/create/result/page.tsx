"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JournalCanvas } from "@/components/JournalCanvas";
import { CircularProgress } from "@/components/CircularProgress";
import { createMusicGeneration, type TaskState } from "@/lib/api";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const words = searchParams.get("words") || "";
  const initialLyrics = searchParams.get("lyrics") || "";
  const caption = searchParams.get("caption") || words;

  const [stage, setStage] = useState<"loading" | "done" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [songResult, setSongResult] = useState<{
    audio_url: string;
    cover_image_url?: string;
    song_id?: string;
  } | null>(null);

  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Simulate progress while waiting for real events
  useEffect(() => {
    if (stage !== "loading") return;
    const animate = () => {
      targetRef.current = Math.min(
        targetRef.current + 0.003 + Math.random() * 0.006,
        0.85
      );
      setProgress((prev) => prev + (targetRef.current - prev) * 0.04);
      if (targetRef.current < 0.85) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    const id = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 800);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(id);
    };
  }, [stage]);

  // Start music generation
  useEffect(() => {
    if (!initialLyrics || stage !== "loading") return;

    let cancelled = false;

    const start = async () => {
      const result = await createMusicGeneration({
        mode: "custom",
        caption,
        lyrics: initialLyrics,
        title: caption.slice(0, 50) || "Untitled",
      });

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setStage("error");
        return;
      }

      const taskId = result.job_id;
      if (!taskId) {
        setError("No job ID returned");
        setStage("error");
        return;
      }

      // Listen to real task events
      const es = createEventSourceForTask(taskId);
      eventSourceRef.current = es;

      es.addEventListener("progress", (e) => {
        if (cancelled) return;
        try {
          const state: TaskState = JSON.parse(e.data);
          if (state.status === "completed" && state.result) {
            setProgress(1);
            setSongResult({
              audio_url: state.result.audio_url || "",
              cover_image_url: state.result.cover_image_url,
              song_id: state.result.song_id,
            });
            setStage("done");
            es.close();
          } else if (state.status === "failed") {
            setError(state.message || "Generation failed");
            setStage("error");
            es.close();
          } else {
            // Use real progress from backend, capped at 95%
            setProgress(Math.min(state.progress / 100, 0.95));
          }
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("error", () => {
        if (cancelled) return;
        setError("Connection lost. Please try again.");
        setStage("error");
        es.close();
      });
    };

    start();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
    };
  }, [initialLyrics, caption, stage]);

  const handleCreateAnother = useCallback(() => {
    router.push("/create");
  }, [router]);

  const canvasWords = initialLyrics
    ? initialLyrics.split(/[\s\n]+/).filter((w) => w.length > 1).slice(0, 30)
    : words.split(",").map((w) => w.trim()).filter(Boolean);

  const audioUrl = songResult?.audio_url;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Canvas — always show in background */}
      <div className="absolute inset-0 z-0">
        {stage === "loading" && (
          <JournalCanvas words={canvasWords} progress={progress} />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-xl w-full">

        {/* Loading state */}
        {stage === "loading" && (
          <div className="flex flex-col items-center gap-8">
            <CircularProgress progress={progress} size={140} />
            <div className="flex flex-col items-center gap-2">
              <p
                className="text-sm uppercase tracking-widest"
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-caveat), cursive",
                  letterSpacing: "0.2em",
                  fontSize: "1.1rem",
                }}
              >
                Creating your song
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                This may take a few minutes
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {stage === "error" && (
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-lg" style={{ color: "var(--danger)" }}>
              {error || "Something went wrong"}
            </p>
            <button onClick={handleCreateAnother} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* Done state */}
        {stage === "done" && songResult && (
          <div className="flex flex-col items-center gap-8 w-full">

            {/* Success header */}
            <div className="flex flex-col items-center gap-2">
              <p
                className="text-3xl font-bold"
                style={{
                  fontFamily: "var(--font-caveat), cursive",
                  color: "var(--text-primary)",
                }}
              >
                Your song is ready!
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {caption}
              </p>
            </div>

            {/* Cover image + audio */}
            <div className="flex flex-col items-center gap-6 w-full p-6 rounded-2xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}>

              {/* Cover */}
              {songResult.cover_image_url ? (
                <img
                  src={songResult.cover_image_url}
                  alt="Album cover"
                  className="w-48 h-48 rounded-xl object-cover"
                  style={{ boxShadow: "0 8px 32px rgba(168,85,247,0.25)" }}
                />
              ) : (
                <div
                  className="w-48 h-48 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-dim)", border: "1px solid var(--border)" }}
                >
                  <span style={{ color: "var(--accent)", fontFamily: "var(--font-caveat), cursive", fontSize: "3rem" }}>
                    {caption.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Audio player */}
              {audioUrl && (
                <audio
                  controls
                  className="w-full max-w-sm"
                  src={audioUrl}
                  style={{ height: "40px" }}
                >
                  Your browser does not support audio playback.
                </audio>
              )}

              {/* Lyrics */}
              {initialLyrics && (
                <details className="w-full max-w-sm">
                  <summary
                    className="cursor-pointer text-sm"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-caveat), cursive" }}
                  >
                    View lyrics
                  </summary>
                  <pre
                    className="mt-3 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-caveat), cursive",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {initialLyrics}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button onClick={handleCreateAnother} className="btn-primary px-8">
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function createEventSourceForTask(taskId: string): EventSource {
  // Get Supabase session token (same key used by existing auth system)
  let token = "";
  try {
    const sess = JSON.parse(localStorage.getItem("supabase-session") || "{}");
    token = sess?.access_token || "";
  } catch { /* ignore */ }

  const base = "http://localhost:8000";
  const url = `${base}/api/generate/events/${taskId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  return new EventSource(url);
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </main>
    }>
      <ResultContent />
    </Suspense>
  );
}
