"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MOOD_WORDS = [
  "wonder", "drift", "bloom", "glow", "wave", "spark",
  "dream", "bloom", "soft", "wild", "calm", "blaze",
  "echo", "fade", "rise", "shine", "whisper", "roar",
  "flow", "tide", "moon", "sun", "star", "soul",
  "heart", "mind", "free", "open", "deep", "wide",
];

function pickRandom(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedWords, setSelectedWords] = useState<string[]>(
    () => searchParams.get("words")?.split(",").filter(Boolean) || pickRandom(MOOD_WORDS, 3)
  );
  const [customInput, setCustomInput] = useState("");

  const toggleWord = useCallback((word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  }, []);

  const shuffleWords = useCallback(() => {
    setSelectedWords(pickRandom(MOOD_WORDS, 3));
  }, []);

  const handleStart = () => {
    const words =
      customInput.trim() ||
      selectedWords.join(",");
    router.push(
      `/create/lyrics?words=${encodeURIComponent(words)}&lyrics=`
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ background: "var(--bg)" }}>

      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-xl">

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-5xl font-bold"
            style={{ fontFamily: "var(--font-caveat), cursive", color: "var(--text-primary)" }}
          >
            What is your mood?
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Pick a few words or write your own
          </p>
        </div>

        {/* Word chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {selectedWords.map((word) => (
            <button
              key={word}
              onClick={() => toggleWord(word)}
              className="chip active"
            >
              {word}
            </button>
          ))}
        </div>

        {/* Shuffle */}
        <button onClick={shuffleWords} className="btn-secondary text-sm">
          Shuffle words
        </button>

        {/* Or custom input */}
        <div className="flex flex-col items-center gap-3 w-full">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>or type your own</span>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="input-base text-center text-lg"
            style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "1.25rem" }}
            placeholder="type your mood words..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
          />
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          className="btn-primary px-12 py-3 text-lg mt-2"
          disabled={!selectedWords.length && !customInput.trim()}
        >
          Start
        </button>
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </main>
    }>
      <CreateContent />
    </Suspense>
  );
}
