# Skill: 复刻 MoodType Loading 动效

> 复刻 https://moodtype.vercel.app/ 的 loading 过渡动画效果（圆形进度环 + 手写字体沿圆周漂浮）

---

## 1. 框架与技术栈

| 层级 | 技术选择 | 说明 |
|---|---|---|
| 前端框架 | **Next.js 16 + React 19** | App Router 体系，使用 Client Component 挂载 Canvas |
| 样式 | **TailwindCSS** | 全程原子类，无需额外 CSS 文件 |
| 动画/渲染 | **原生 HTML5 Canvas 2D API** | 无任何第三方 canvas 库，纯原生实现 |
| 手写字体 | **Google Fonts / 自定义 woff2** | 选用手写风格字体（如 `Caveat`、`Kalam`、`Patrick Hand`） |
| 部署 | Vercel | Next.js 原生部署 |

### 项目初始化命令

```bash
npx create-next-app@latest moodtype --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

---

## 2. 配色与字体

### 配色方案（MoodType 风格参考）

```css
:root {
  --bg: #0a0a0f;           /* 深色背景 */
  --surface: #13131a;      /* 卡片/容器 */
  --text-primary: #f5f5f5; /* 主文字 */
  --text-muted: #6b6b7b;   /* 次要文字 */
  --accent: #a855f7;        /* 紫色强调色（进度环/漂浮字） */
  --accent-light: #c084fc; /* 亮紫（glow 效果） */
  --accent-glow: rgba(168, 85, 247, 0.3); /* 发光效果 */
}
```

### 字体方案

```tsx
// app/layout.tsx
import { Caveat, Kalam } from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
  weight: ["400", "500", "600", "700"],
});

const kalam = Kalam({
  subsets: ["latin"],
  variable: "--font-handwriting-alt",
  weight: ["300", "400", "700"],
});
```

**推荐手写字体组合：**
- 主体手写：`Caveat`（圆润现代）
- 备用：`Kalam`（经典手写）
- 备选：`Indie Flower`、`Shadows Into Light`、`Reenie Beanie`

---

## 3. Canvas 核心实现

### 3.1 组件结构

```
app/
├── app/page.tsx                    # 主页（输入页面）
├── app/generate/page.tsx           # 生成页（Loading 动效在这里触发）
├── components/
│   ├── JournalCanvas.tsx           # Canvas 动效核心组件
│   ├── CircularProgress.tsx        # 进度环组件（可纯 CSS 实现）
│   └── FloatingWord.tsx           # 单个漂浮字符组件（如果用 DOM 而非 Canvas）
└── hooks/
    └── useFloatingWords.ts         # 漂浮逻辑 hook
```

### 3.2 Canvas 漂浮文字核心算法

```tsx
// components/JournalCanvas.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";

interface Word {
  char: string;
  angle: number;       // 当前角度 (弧度)
  radius: number;       // 轨道半径
  baseRadius: number;   // 基础半径
  speed: number;        // 旋转速度
  amplitude: number;    // 半径抖动幅度
  phase: number;       // 初始相位（用于错开每个字的位置）
  opacity: number;      // 透明度
  size: number;         // 字号
  color: string;        // 颜色
}

interface FloatingCanvasProps {
  words: string[];          // 输入的词汇列表
  progress: number;          // 0-1 进度
  radius?: number;           // 轨道半径（默认 canvas 短边的 35%）
  baseFontSize?: number;     // 基础字号（默认 18）
  fontFamily?: string;       // 字体（默认 --font-handwriting）
  textColor?: string;        // 文字颜色
}

export function JournalCanvas({
  words,
  progress,
  radius: orbitRadius,
  baseFontSize = 18,
  fontFamily = "var(--font-handwriting)",
  textColor = "#a855f7",
}: FloatingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<Word[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // 初始化字符数据
  const initWords = useCallback((width: number, height: number) => {
    const allChars = words.join(" ").split("");
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = orbitRadius ?? Math.min(width, height) * 0.35;

    wordsRef.current = allChars.map((char, i) => ({
      char,
      angle: (i / allChars.length) * Math.PI * 2,
      radius,
      baseRadius: radius,
      speed: 0.15 + Math.random() * 0.1,          // 每个字速度略有不同
      amplitude: 3 + Math.random() * 5,             // 抖动幅度
      phase: Math.random() * Math.PI * 2,           // 随机初始相位
      opacity: 0.6 + Math.random() * 0.4,           // 透明度
      size: baseFontSize + Math.random() * 6,       // 字号随机
      color: textColor,
    }));
  }, [words, orbitRadius, baseFontSize, textColor]);

  // 动画循环
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // 清空画布（带轻微渐隐效果制造拖尾）
    ctx.fillStyle = "rgba(10, 10, 15, 0.15)";
    ctx.fillRect(0, 0, width, height);

    // 绘制每个字符
    wordsRef.current.forEach((word) => {
      // 更新角度（旋转）
      word.angle += word.speed * 0.016;

      // 更新半径（抖动 = 漂浮感）
      const drift = Math.sin(timeRef.current * 0.001 + word.phase) * word.amplitude;
      word.radius = word.baseRadius + drift;

      // 进度驱动：半径随 progress 增大
      const expandedRadius = word.radius + progress * Math.min(width, height) * 0.1;

      // 计算位置
      const x = centerX + expandedRadius * Math.cos(word.angle);
      const y = centerY + expandedRadius * Math.sin(word.angle);

      // 绘制文字
      ctx.save();
      ctx.translate(x, y);
      // 让文字底部朝向圆心
      ctx.rotate(word.angle + Math.PI / 2);

      ctx.font = `${word.size}px ${fontFamily}`;
      ctx.fillStyle = word.color;
      ctx.globalAlpha = word.opacity * (0.5 + progress * 0.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word.char, 0, 0);

      ctx.restore();
    });

    timeRef.current = timestamp;
    animFrameRef.current = requestAnimationFrame(animate);
  }, [fontFamily, progress]);

  // 设置与启动
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 高 DPI 支持
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    initWords(rect.width, rect.height);

    // 初始清空
    const initCtx = canvas.getContext("2d");
    if (initCtx) {
      initCtx.fillStyle = "#0a0a0f";
      initCtx.fillRect(0, 0, rect.width, rect.height);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate, initWords]);

  // 进度变化时重绘（不变动角度，只更新视觉参数）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 进度变化时，字体的 opacity 和 radius 会自动在 animate 中响应
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ width: "100%", height: "100%" }}
      aria-label="Interactive journal words"
    />
  );
}
```

### 3.3 进度环实现（两种方案）

#### 方案 A：CSS conic-gradient（推荐，最简洁）

```tsx
// components/CircularProgress.tsx
"use client";

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 3,
  color = "#a855f7",
  trackColor = "rgba(168, 85, 247, 0.15)",
}: CircularProgressProps) {
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* 底环 */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${trackColor} 0deg, transparent 0deg)`,
        }}
      />
      {/* 进度环 */}
      <div
        className="absolute inset-0 rounded-full transition-[background]"
        style={{
          background: `conic-gradient(${color} 0deg, ${color} ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`,
        }}
      />
      {/* 内圆遮罩 */}
      <div
        className="absolute rounded-full z-10"
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          background: "#0a0a0f",
        }}
      />
      {/* 百分比文字 */}
      <div className="relative z-20 flex flex-col items-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color, fontFamily: "var(--font-handwriting)" }}
        >
          {Math.round(progress * 100)}
        </span>
        <span className="text-xs text-[#6b6b7b] uppercase tracking-widest">
          %
        </span>
      </div>
    </div>
  );
}
```

#### 方案 B：SVG stroke-dasharray（精度更高）

```tsx
export function CircularProgressSVG({ progress, size = 120 }: CircularProgressProps) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* 底环 */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(168,85,247,0.15)"
        strokeWidth={3}
      />
      {/* 进度 */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#a855f7"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
}
```

---

## 4. 完整 Loading 页面组件

```tsx
// app/generate/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { JournalCanvas } from "@/components/JournalCanvas";
import { CircularProgress } from "@/components/CircularProgress";

interface GeneratePageProps {
  searchParams: Promise<{ words?: string }>;
}

export default function GeneratePage({ searchParams }: GeneratePageProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [stage, setStage] = useState<"loading" | "done">("loading");
  const targetProgress = useRef(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // 从 URL params 获取词汇（实际项目从 Server Component searchParams 获取）
    const getWords = async () => {
      const params = await searchParams;
      const raw = params.words ?? "";
      setWords(raw.split(",").filter(Boolean));
      targetProgress.current = 0;
    };
    getWords();
  }, [searchParams]);

  // 模拟生成进度（实际项目中替换为真实的 AI 生图 / Supabase 存储进度）
  useEffect(() => {
    if (words.length === 0) return;

    const animate = () => {
      targetProgress.current = Math.min(targetProgress.current + 0.008 + Math.random() * 0.015, 1);

      setProgress((prev) => {
        const delta = targetProgress.current - prev;
        return prev + delta * 0.08; // 平滑插值
      });

      if (targetProgress.current < 0.99) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(1);
        // 完成后等待 800ms 再跳转到展示页
        setTimeout(() => setStage("done"), 800);
      }
    };

    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 500); // 延迟启动，让 Canvas 先渲染

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearTimeout(timeoutId);
    };
  }, [words]);

  // 完成跳转
  useEffect(() => {
    if (stage === "done") {
      const timeoutId = setTimeout(() => {
        router.push(`/gallery?words=${encodeURIComponent(words.join(","))}`);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [stage, words, router]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Canvas 漂浮效果层 */}
      <div className="absolute inset-0 z-0">
        <JournalCanvas
          words={words}
          progress={progress}
          baseFontSize={16}
          fontFamily="var(--font-handwriting)"
          textColor="#a855f7"
        />
      </div>

      {/* 进度环覆盖层 */}
      <div className="relative z-10 flex flex-col items-center">
        <CircularProgress progress={progress} size={128} />

        {/* Loading 文字 */}
        {stage === "loading" && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <p
              className="text-sm text-[#6b6b7b] uppercase tracking-[0.3em]"
              style={{ fontFamily: "var(--font-handwriting)", letterSpacing: "0.3em" }}
            >
              Loading
            </p>
            <p
              className="text-base text-[#f5f5f5] text-center max-w-xs"
              style={{ fontFamily: "var(--font-handwriting)" }}
            >
              Creating your mood art...
            </p>
          </div>
        )}
      </div>

      {/* 完成提示 */}
      {stage === "done" && (
        <div className="absolute bottom-12 z-20 animate-pulse">
          <p
            className="text-sm text-[#a855f7]"
            style={{ fontFamily: "var(--font-handwriting)" }}
          >
            Done! Taking you to gallery...
          </p>
        </div>
      )}
    </main>
  );
}
```

---

## 5. 布局与交互流程

### 5.1 完整用户流程

```
[主页] 输入词汇 → 点击 "Finished"
       ↓
[生成页] Canvas 漂浮动效 + 进度环 + 模拟 AI 生成进度
       ↓
[Gallery 页] 展示生成的词云/壁纸
```

### 5.2 主页输入组件

```tsx
// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (!input.trim()) return;
    const encoded = encodeURIComponent(input.trim());
    router.push(`/generate?words=${encoded}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] px-4">
      <h1
        className="text-5xl font-bold text-[#f5f5f5] mb-12 tracking-tight"
        style={{ fontFamily: "var(--font-handwriting)" }}
      >
        MoodType
      </h1>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your mood words..."
        className="w-full max-w-md bg-[#13131a] border border-[rgba(168,85,247,0.2)] rounded-2xl px-6 py-4 text-[#f5f5f5] text-lg resize-none outline-none focus:border-[#a855f7] transition-colors placeholder:text-[#6b6b7b]"
        style={{ fontFamily: "var(--font-handwriting)" }}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      <button
        onClick={handleSubmit}
        className="mt-6 px-8 py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-full font-medium transition-colors active:scale-95"
      >
        Finished
      </button>
    </main>
  );
}
```

---

## 6. 注意事项与坑点

### 性能相关

1. **高 DPI (Retina) 支持** — 必须对 canvas 做 `devicePixelRatio` 缩放，否则在高清屏上文字模糊：
   ```tsx
   const dpr = window.devicePixelRatio || 1;
   canvas.width = rect.width * dpr;
   canvas.height = rect.height * dpr;
   ctx.scale(dpr, dpr);
   ```

2. **不要在 `useEffect` 的 animate 里创建新的 RAF** — 始终在 `useRef` 中持有 `animFrameRef`，在 cleanup 中 `cancelAnimationFrame`

3. **大量文字时的优化** — 如果词很多（>100字），考虑只渲染可见角度范围内的字：
   ```tsx
   // 只渲染画布内可见的字
   const visible = word.radius > 0;
   if (!visible) return;
   ```

### 视觉相关

4. **canvas 背景要持续清空** — 推荐用半透明清空（`rgba(10,10,15, 0.15)`）而非完全清空，可以做出自然的运动拖尾效果，比纯黑色更有"光晕感"

5. **手写字体的 fallback** — 多个 Google Fonts fallback：
   ```css
   .handwriting {
     font-family: var(--font-handwriting), 'Caveat', 'Kalam',
       'Patrick Hand', 'Indie Flower', cursive;
   }
   ```

6. **进度环与 Canvas 的层叠关系** — Canvas 在 `z-0`，进度环在 `z-10`，两者叠加，进度环在 Canvas 上方但不影响交互

7. **文字方向** — `ctx.rotate(word.angle + Math.PI / 2)` 让文字底部朝向圆心，看起来像环绕星球

### Next.js 相关

8. **字体加载** — Next.js 的 `next/font` 会自动优化字体加载，配合 canvas 时无需额外处理

9. **Client Component** — 任何使用了 `useRef`、`useEffect`、`requestAnimationFrame` 的组件必须加 `"use client"` 指令

10. **Router** — 使用 `useRouter` 进行页面跳转，不要用 `<a>` 标签，否则跳转会触发浏览器刷新，失去 SPA 体验

### 调试技巧

11. **Canvas 调试** — 在 animate 函数开头加 `ctx.strokeStyle = "red"; ctx.strokeRect(...)` 可视化边界
12. **逐字动画参数调优** — 核心三个参数：`speed`（旋转速度）、`amplitude`（漂浮幅度）、`opacity`（透明度），建议取值范围：
    - `speed`: 0.05 ~ 0.25（太小不动，太大像乱码）
    - `amplitude`: 2 ~ 8px（太小没漂浮感，太大像心电图）
    - `opacity`: 0.4 ~ 1.0

---

## 7. 多步骤 / 多阶段路由策略

MoodType 采用了 **SPA 状态切换**（`useState` + 条件渲染），URL 从头到尾不变。但对于**耗时长、步骤多**的 AI 生成流程（如：输入 → 生成歌词 → 生成歌曲 → 结果），更推荐**混合方案**：每步独立 URL + `router.push()` SPA 跳转。

### 推荐目录结构：`app/create/`

```
app/create/
├── page.tsx              # 阶段1：输入单词
├── lyrics/page.tsx        # 阶段2：生成歌词（Canvas Loading）
├── music/page.tsx          # 阶段3：生成歌曲（Canvas Loading）
└── result/page.tsx        # 阶段4：最终结果
```

### 阶段1 — 输入页

```tsx
// app/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const [words, setWords] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (!words.trim()) return;
    router.push(`/create/lyrics?words=${encodeURIComponent(words.trim())}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f]">
      <h1 className="text-4xl font-bold text-white mb-8">Create</h1>
      <textarea
        value={words}
        onChange={(e) => setWords(e.target.value)}
        placeholder="Enter mood words..."
        className="w-full max-w-md bg-[#13131a] border border-[rgba(168,85,247,0.2)]
          rounded-2xl px-6 py-4 text-white text-lg resize-none outline-none
          focus:border-[#a855f7] transition-colors"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        className="mt-6 px-8 py-3 bg-[#a855f7] hover:bg-[#9333ea]
          text-white rounded-full font-medium transition-colors"
      >
        Generate Lyrics
      </button>
    </main>
  );
}
```

### 阶段2 — 生成歌词（带 Canvas Loading）

```tsx
// app/create/lyrics/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JournalCanvas } from "@/components/JournalCanvas";
import { CircularProgress } from "@/components/CircularProgress";

export default function LyricsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const words = searchParams.get("words") ?? "";

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"generating" | "done">("generating");
  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!words) { router.push("/create"); return; }

    const tick = () => {
      targetRef.current = Math.min(targetRef.current + 0.008 + Math.random() * 0.015, 1);
      setProgress(prev => prev + (targetRef.current - prev) * 0.06);
      if (targetRef.current < 0.99) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(1);
        setStage("done");
      }
    };

    const id = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 400);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(id); };
  }, [words, router]);

  // 完成后调用 API 生成歌词，然后跳转到下一阶段
  useEffect(() => {
    if (stage !== "done") return;
    const id = setTimeout(async () => {
      // 在这里调用歌词生成 API
      // const result = await generateLyrics(words);
      const result = "Generated lyrics placeholder...";
      router.push(`/create/music?words=${encodeURIComponent(words)}&lyrics=${encodeURIComponent(result)}`);
    }, 600);
    return () => clearTimeout(id);
  }, [stage, words, router]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 z-0">
        <JournalCanvas words={words.split(/[\s,]+/)} progress={progress} />
      </div>
      <div className="relative z-10">
        <CircularProgress progress={progress} size={128} />
        <p className="mt-6 text-center text-[#6b6b7b] text-sm uppercase tracking-widest">
          Generating lyrics
        </p>
      </div>
    </main>
  );
}
```

### 为什么混合方案更适合 AI 多步骤生成

| 纯 SPA（URL不变）的问题 | 混合方案如何解决 |
|---|---|
| 用户等30秒生成歌曲，不小心刷新 → **进度全部丢失** | 每个阶段独立 URL，刷新后可从该步骤恢复 |
| 用户想分享"这是我的歌词结果" | **URL 就是分享链接** — `/create/lyrics?words=...&lyrics=...` |
| 浏览器后退按钮无效 | 后退按钮**回到上一个阶段** |
| 无 SEO：没有可索引的页面 | **每个阶段都是真实 URL** — 搜索引擎可抓取 |

### 关键实现注意点

- **`useSearchParams`** 在 Next.js 14+ 中需要 `Suspense` 边界包裹 — 用 `<Suspense fallback={...}>` 或用 Server Component 读取 params 后传下来
- **通过 URL params 存储结果** 以支持刷新恢复：`?words=...&lyrics=...&music=...`，刷新后各阶段都能拿到之前的数据
- **`router.push()`** 是 SPA 导航 — 不刷新页面，无白屏闪烁，只有 React 重新渲染新路由
- **中间 Loading 阶段用 `router.replace()`** 可以不写入浏览器历史，避免用户在生成过程中点后退产生困惑

---

## 7. 进阶：交互增强

### 添加鼠标/触摸交互（字被吸引）

```tsx
// 在 animate 函数中，绘制前加入：
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX.current = e.clientX - rect.left;
  mouseY.current = e.clientY - rect.top;
});

// 在计算位置时：
const dx = mouseX.current - x;
const dy = mouseY.current - y;
const dist = Math.sqrt(dx * dx + dy * dy);
const repelStrength = Math.max(0, 1 - dist / 200); // 200px 范围
const repelX = (x + dx / dist * repelStrength * 15);
const repelY = (y + dy / dist * repelStrength * 15);
```

### 添加颜色渐变

```tsx
// 根据进度动态改变颜色
const hue = 270 + progress * 60; // 紫色到蓝紫色过渡
ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
```

---

## 8. 完整依赖（package.json 关键部分）

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.2.0"
  }
}
```

> 注意：TailwindCSS v4 语法有变化，如使用 v3 请将 `@apply` 相关写法改为标准 Tailwind class。
