# ShareAnything Design Renewal - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ShareAnything as a Next.js App Router project with a modern dark SaaS design (frosted glass, interactive grid, terminal aesthetics, cyan/teal accent). Preserve all existing features and API integrations.

**Architecture:** New Next.js 15 project in `~/Desktop/Dev/share-anything-web/` (current project renamed to `-old`). Business logic (API services, hooks, contexts, utils, i18n, types) is copied from old project. UI components are rebuilt with new design system. Pages are rebuilt on new components with identical functionality.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Radix UI, Motion v12, Geist/Geist Mono fonts

**Spec:** `docs/superpowers/specs/2026-04-14-design-renewal-spec.md`

**Old project reference:** `~/Desktop/Dev/share-anything-web-old/`

---

## Phase 1: Project Bootstrap

### Task 1: Rename current project and create Next.js project

**Files:**
- Rename: `~/Desktop/Dev/share-anything-web/` → `~/Desktop/Dev/share-anything-web-old/`
- Create: `~/Desktop/Dev/share-anything-web/` (new Next.js project)

- [ ] **Step 1: Rename current project**

```bash
mv ~/Desktop/Dev/share-anything-web ~/Desktop/Dev/share-anything-web-old
```

- [ ] **Step 2: Create new Next.js project**

```bash
cd ~/Desktop/Dev
npx create-next-app@latest share-anything-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted:
- Would you like to use Turbopack? → Yes

- [ ] **Step 3: Verify project runs**

```bash
cd ~/Desktop/Dev/share-anything-web
npm run dev
```

Expected: Dev server starts at localhost:3000

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project"
```

---

### Task 2: Install all dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install preserved + new dependencies**

```bash
cd ~/Desktop/Dev/share-anything-web

# UI primitives (Radix)
npm install @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-separator @radix-ui/react-switch @radix-ui/react-tooltip

# Styling utilities
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate

# Animation
npm install motion

# File handling
npm install react-dropzone axios react-pdf pdfjs-dist docx-preview xlsx jszip pako

# QR code
npm install qrcode.react qr-code-styling

# Other
npm install lottie-react @marsidev/react-turnstile @heroicons/react

# Fonts (Pretendard, Noto Sans JP/SC/TC loaded via CDN in layout)
# Geist and Geist Mono come with next/font
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @types/pako
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install all dependencies"
```

---

### Task 3: Copy business logic from old project

**Files:**
- Create: `src/services/api.ts`
- Create: `src/types/index.ts`
- Create: `src/hooks/useP2PUploader.ts`, `src/hooks/useP2PDownloader.ts`, `src/hooks/useThumbnail.ts`
- Create: `src/utils/format.ts`, `src/utils/filePreview.ts`, `src/utils/hwpParser.ts`, `src/utils/webrtc.ts`, `src/utils/pdfWorkerSetup.ts`, `src/utils/uploadFileStorage.ts`, `src/utils/providerLogos.tsx`
- Create: `src/i18n/` (entire directory)
- Create: `src/context/AuthContext.tsx`, `src/context/ThemeContext.tsx`, `src/context/LanguageContext.tsx`, `src/context/ToastContext.tsx`, `src/context/QuickAccessUploadContext.tsx`
- Create: `src/assets/lottie-404.json`

- [ ] **Step 1: Copy types, services, utils, hooks, i18n, assets**

```bash
cd ~/Desktop/Dev/share-anything-web

# Types
cp ../share-anything-web-old/src/types/index.ts src/types/index.ts

# Services
mkdir -p src/services
cp ../share-anything-web-old/src/services/api.ts src/services/api.ts

# Hooks
mkdir -p src/hooks
cp ../share-anything-web-old/src/hooks/useP2PUploader.ts src/hooks/useP2PUploader.ts
cp ../share-anything-web-old/src/hooks/useP2PDownloader.ts src/hooks/useP2PDownloader.ts
cp ../share-anything-web-old/src/hooks/useThumbnail.ts src/hooks/useThumbnail.ts

# Utils
mkdir -p src/utils
cp ../share-anything-web-old/src/utils/format.ts src/utils/format.ts
cp ../share-anything-web-old/src/utils/filePreview.ts src/utils/filePreview.ts
cp ../share-anything-web-old/src/utils/hwpParser.ts src/utils/hwpParser.ts
cp ../share-anything-web-old/src/utils/webrtc.ts src/utils/webrtc.ts
cp ../share-anything-web-old/src/utils/pdfWorkerSetup.ts src/utils/pdfWorkerSetup.ts
cp ../share-anything-web-old/src/utils/uploadFileStorage.ts src/utils/uploadFileStorage.ts
cp ../share-anything-web-old/src/utils/providerLogos.tsx src/utils/providerLogos.tsx

# i18n (entire directory)
cp -r ../share-anything-web-old/src/i18n src/i18n

# Context
mkdir -p src/context
cp ../share-anything-web-old/src/context/AuthContext.tsx src/context/AuthContext.tsx
cp ../share-anything-web-old/src/context/ThemeContext.tsx src/context/ThemeContext.tsx
cp ../share-anything-web-old/src/context/LanguageContext.tsx src/context/LanguageContext.tsx
cp ../share-anything-web-old/src/context/ToastContext.tsx src/context/ToastContext.tsx
cp ../share-anything-web-old/src/context/QuickAccessUploadContext.tsx src/context/QuickAccessUploadContext.tsx

# Assets
mkdir -p src/assets
cp ../share-anything-web-old/src/assets/lottie-404.json src/assets/lottie-404.json
```

- [ ] **Step 2: Fix import paths for Next.js**

All copied files use relative imports or `lib/utils` - update any path aliases that don't match the new project's `@/*` alias. The key changes:

- Replace `import { cn } from 'lib/utils'` → `import { cn } from '@/lib/utils'` in all files
- Replace `import ... from '../context/...'` → `import ... from '@/context/...'` where needed
- Replace `import ... from '../services/...'` → `import ... from '@/services/...'`
- Replace `import ... from '../hooks/...'` → `import ... from '@/hooks/...'`
- Replace `import ... from '../utils/...'` → `import ... from '@/utils/...'`
- Replace `import ... from '../i18n'` → `import ... from '@/i18n'`
- Replace `import ... from '../types'` → `import ... from '@/types'`

Use find-and-replace across all copied files. Also add `'use client'` directive at the top of all context files and hook files since they use React state/effects.

- [ ] **Step 3: Create cn utility**

```bash
mkdir -p src/lib
```

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Fix react-router-dom references in contexts**

The copied contexts use `useNavigate`, `useLocation` from `react-router-dom`. These must be replaced with `next/navigation` equivalents:

- `useNavigate()` → `useRouter()` from `next/navigation` (use `router.push()` instead of `navigate()`)
- `useLocation()` → `usePathname()` and `useSearchParams()` from `next/navigation`

Apply these changes in: `AuthContext.tsx` (if it uses navigation). Note: most contexts just manage state and don't navigate. Check each file and fix only what's needed.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any remaining import errors. Some files may have compile errors from missing component imports - that's expected, as UI components haven't been created yet. Focus on ensuring type definitions, services, utils, and hooks compile.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: copy business logic from old project"
```

---

## Phase 2: Design System Foundation

### Task 4: Configure Tailwind CSS and global styles

**Files:**
- Modify: `tailwind.config.ts` (or `tailwind.config.js`)
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Set up Tailwind config with design tokens**

Replace `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        elevated: "hsl(var(--elevated))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Pretendard", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "bubble-pop": {
          "0%": { opacity: "0", scale: "0.85" },
          "60%": { opacity: "1", scale: "1.03" },
          "100%": { opacity: "1", scale: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bubble-pop": "bubble-pop 0.35s ease-out forwards",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(function ({ addVariant }) {
      addVariant("can-hover", "@media (hover: hover)");
    }),
  ],
};

export default config;
```

- [ ] **Step 2: Set up global CSS with theme variables**

Replace `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light Mode */
    --background: 0 0% 98%;
    --foreground: 0 0% 3.9%;
    --surface: 0 0% 100%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --elevated: 0 0% 96.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 170 100% 29%;
    --primary-hover: 170 100% 25%;
    --primary-foreground: 0 0% 100%;
    --accent: 187 100% 50%;
    --accent-foreground: 0 0% 3.9%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 45.1%;
    --muted-foreground: 0 0% 63.9%;
    --destructive: 0 84.2% 50.2%;
    --destructive-foreground: 0 0% 98%;
    --success: 142 71% 45%;
    --warning: 38 92% 50%;
    --border: 0 0% 0% / 0.08;
    --input: 0 0% 80%;
    --ring: 170 100% 29%;
  }

  .dark {
    /* Dark Mode */
    --background: 0 0% 0%;
    --foreground: 0 0% 98%;
    --surface: 0 0% 3.9%;
    --card: 0 0% 9%;
    --card-foreground: 0 0% 98%;
    --elevated: 0 0% 15%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;
    --primary: 163 100% 42%;
    --primary-hover: 163 100% 47%;
    --primary-foreground: 0 0% 0%;
    --accent: 187 100% 50%;
    --accent-foreground: 0 0% 0%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 45.1%;
    --muted-foreground: 0 0% 63.9%;
    --destructive: 0 72.2% 50.6%;
    --destructive-foreground: 0 0% 98%;
    --success: 142 71% 45%;
    --warning: 38 92% 50%;
    --border: 0 0% 100% / 0.08;
    --input: 0 0% 22%;
    --ring: 163 100% 42%;
  }
}

@layer base {
  html {
    scrollbar-gutter: stable;
  }
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground break-keep;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Glass utility classes */
.glass-l1 {
  @apply backdrop-blur-[16px] border;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 212, 170, 0.05);
}
.glass-l2 {
  @apply backdrop-blur-[12px] border;
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.07);
}
.glass-l3 {
  @apply border;
  background: rgba(20, 20, 20, 0.95);
  border-color: rgba(255, 255, 255, 0.08);
}

/* Light mode glass adjustments */
:root .glass-l1 {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(12px);
}
:root .glass-l2 {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);
}
:root .glass-l3 {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(0, 0, 0, 0.08);
}

/* Noise overlay */
.noise-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

:root .noise-overlay::after {
  opacity: 0.02;
}

/* View Transition */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* docx-preview library styles (modal) */
.docx-container section.docx {
  padding: 32px 40px !important;
  width: 100% !important;
  min-height: auto !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}
.docx-thumb-container .docx-wrapper {
  background: transparent !important;
  padding: 0 !important;
}
.docx-thumb-container section.docx {
  box-shadow: none !important;
  margin: 0 !important;
  padding-top: 12px !important;
}
```

- [ ] **Step 3: Set up root layout with fonts**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareAnything",
  description: "Fast & Secure File Transfer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${GeistSans.variable} ${GeistMono.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Pretendard */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Noto Sans JP / SC / TC for i18n */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans noise-overlay">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify dev server runs with new styles**

```bash
npm run dev
```

Visit localhost:3000 - should show default Next.js page with dark background (#000) and Geist font.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: configure design system foundation (Tailwind, themes, fonts, glass utilities)"
```

---

### Task 5: Interactive Grid Background component

**Files:**
- Create: `src/components/InteractiveGridBg.tsx`

- [ ] **Step 1: Create the interactive grid background**

Create `src/components/InteractiveGridBg.tsx`:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface InteractiveGridBgProps {
  className?: string;
  dotSize?: number;
  dotSpacing?: number;
  spotlightRadius?: number;
  /** stronger glow on homepage */
  intense?: boolean;
}

export default function InteractiveGridBg({
  className = '',
  dotSize = 1,
  dotSpacing = 24,
  spotlightRadius = 200,
  intense = false,
}: InteractiveGridBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { x: mx, y: my } = mouseRef.current;

    ctx.clearRect(0, 0, width, height);

    const baseOpacity = intense ? 0.06 : 0.04;
    const spotlightOpacity = intense ? 0.25 : 0.15;
    const r = spotlightRadius;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
        const inSpotlight = dist < r;
        const opacity = inSpotlight
          ? baseOpacity + (spotlightOpacity - baseOpacity) * (1 - dist / r)
          : baseOpacity;

        if (inSpotlight) {
          // cyan tint for dots near cursor
          const tintStrength = (1 - dist / r) * 0.6;
          ctx.fillStyle = `rgba(0, ${Math.round(212 * tintStrength + 255 * (1 - tintStrength))}, ${Math.round(170 * tintStrength + 255 * (1 - tintStrength))}, ${opacity})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        }

        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [dotSize, dotSpacing, spotlightRadius, intense]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY + window.scrollY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    // Check if device supports hover (not touch-only)
    const supportsHover = window.matchMedia('(hover: hover)').matches;

    resize();
    window.addEventListener('resize', resize);

    if (supportsHover) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Verify component renders**

Add it temporarily to `src/app/page.tsx`:

```tsx
import InteractiveGridBg from '@/components/InteractiveGridBg';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <InteractiveGridBg intense />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold text-foreground">ShareAnything</h1>
      </div>
    </main>
  );
}
```

Expected: Dark background with subtle dot grid, dots brighten near cursor with cyan tint.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add InteractiveGridBg component with mouse spotlight"
```

---

### Task 6: UI Component Library - Core primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/spinner.tsx`
- Create: `src/components/ui/textarea.tsx`

- [ ] **Step 1: Create Button component**

Create `src/components/ui/button.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground can-hover:hover:bg-primary-hover active:bg-primary-hover shadow-[0_0_12px_rgba(0,212,170,0.15)]",
        destructive:
          "bg-destructive text-destructive-foreground can-hover:hover:bg-destructive/90 active:bg-destructive/90",
        outline:
          "border border-border bg-transparent can-hover:hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.06)] can-hover:hover:text-foreground",
        secondary:
          "bg-[rgba(255,255,255,0.06)] border border-border text-foreground can-hover:hover:bg-[rgba(255,255,255,0.1)] active:bg-[rgba(255,255,255,0.1)]",
        ghost:
          "can-hover:hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.06)] can-hover:hover:text-foreground",
        link: "text-primary underline-offset-4 can-hover:hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        xl: "h-12 px-5 rounded-[10px] text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Create remaining core UI components**

Copy the following components from the old project (`~/Desktop/Dev/share-anything-web-old/src/components/ui/`) and apply these style updates:

**For each component** (`input.tsx`, `badge.tsx`, `label.tsx`, `separator.tsx`, `skeleton.tsx`, `spinner.tsx`, `textarea.tsx`):
1. Copy the file from old project
2. Update import path: `'lib/utils'` → `'@/lib/utils'`
3. Update the color/style classes to use new design tokens:
   - Replace `bg-muted` shimmer colors with `bg-elevated` in Skeleton
   - Replace `text-primary` colors - primary is now cyan `#00D4AA`
   - Spinner: change color to `text-primary` (cyan)
   - Separator: `bg-border` (uses new border token)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add core UI components (Button, Input, Badge, Label, Separator, Skeleton, Spinner, Textarea)"
```

---

### Task 7: UI Component Library - Radix-based components

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/popover.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/switch.tsx`
- Create: `src/components/ui/progress.tsx`
- Create: `src/components/ui/table.tsx`

- [ ] **Step 1: Create Card with glass styling**

Create `src/components/ui/card.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg glass-l2 text-card-foreground",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 2: Copy and restyle Radix-based components**

For each Radix component (`dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`, `checkbox.tsx`, `switch.tsx`, `progress.tsx`, `table.tsx`):

1. Copy from old project
2. Update import: `'lib/utils'` → `'@/lib/utils'`
3. Apply glass styling:
   - **Dialog overlay**: `bg-black/80` (keep)
   - **Dialog content**: replace `bg-card border` with `glass-l1 rounded-2xl`
   - **DropdownMenu content**: replace `bg-popover` with `glass-l3 rounded-lg`
   - **Popover content**: replace `bg-card` with `glass-l3`
   - **Tooltip content**: `glass-l3 rounded-md`
   - **Switch**: checked state `data-[state=checked]:bg-primary` (cyan)
   - **Checkbox**: checked state `data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`
   - **Progress indicator**: `bg-primary shadow-[0_0_8px_rgba(0,212,170,0.3)]` (cyan glow)
   - **Table header**: `bg-surface` background

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Radix-based UI components with glass styling"
```

---

### Task 8: Terminal-style components

**Files:**
- Create: `src/components/ui/terminal-input.tsx`
- Create: `src/components/ui/terminal-tabs.tsx`

- [ ] **Step 1: Create TerminalInput**

Create `src/components/ui/terminal-input.tsx`:

```tsx
'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

interface TerminalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onSubmit?: () => void;
}

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, onSubmit, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit) {
        onSubmit();
      }
      onKeyDown?.(e);
    };

    return (
      <div className="flex items-center gap-3">
        <span className="text-primary font-mono text-lg select-none">&gt;_</span>
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-[rgba(255,255,255,0.04)] border border-border rounded-md px-4 py-2.5 font-mono text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary tracking-widest",
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </div>
    );
  }
);
TerminalInput.displayName = "TerminalInput";

export { TerminalInput };
```

- [ ] **Step 2: Create TerminalTabs**

Create `src/components/ui/terminal-tabs.tsx`:

```tsx
'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

interface TerminalTabsProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export function TerminalTabs({ tabs, activeTab, onTabChange, className }: TerminalTabsProps) {
  return (
    <div className={cn("flex border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex-1 px-4 py-2.5 font-mono text-sm text-center transition-colors border-b-2",
            activeTab === tab.key
              ? "text-primary border-primary bg-primary/5"
              : "text-muted-foreground border-transparent can-hover:hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add TerminalInput and TerminalTabs components"
```

---

## Phase 3: Shared Components

### Task 9: Header component

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: Build the new Header**

Port the Header from old project (`share-anything-web-old/src/components/Header.tsx`) with these changes:

1. Replace `react-router-dom` (`Link`, `useNavigate`) with `next/link` and `next/navigation`
2. Apply Glass L1 styling: `glass-l1 sticky top-0 z-50`
3. Add `>_` prompt icon before "ShareAnything" logo (span with `text-primary font-mono`)
4. Nav links use `font-mono text-xs lowercase` with active state `text-primary`
5. Sign in button uses new primary variant (cyan)
6. Header height: `h-14`
7. Add `'use client'` directive at top (uses hooks)

Key class changes:
- Container: `glass-l1 sticky top-0 z-50` (instead of `bg-card shadow-...`)
- Logo prompt: `<span className="text-primary font-mono text-sm">{'>'}_</span>`
- Nav links: `font-mono text-xs text-muted-foreground can-hover:hover:text-foreground`
- Active nav link: `text-primary`
- Dropdown: uses `glass-l3` via the updated DropdownMenu component

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Header component with glass L1 and terminal prompt"
```

---

### Task 10: Footer, Toast, and shared feature components

**Files:**
- Create: `src/components/Footer.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/components/FilePreviewModal.tsx`
- Create: `src/components/FileThumbnail.tsx`
- Create: `src/components/StyledQRCode.tsx`
- Create: `src/components/TurnstileWidget.tsx`
- Create: `src/components/DownloadLogsModal.tsx`
- Create: `src/components/QuickAccess.tsx`

- [ ] **Step 1: Port Footer**

Copy from old project, apply:
- Replace `react-router-dom` links with `next/link`
- Minimal border-top: `border-t border-[rgba(255,255,255,0.04)]`
- Links: `font-mono text-[11px] text-muted-foreground`
- Popover uses glass-l3 via updated component
- `'use client'` directive

- [ ] **Step 2: Port Toast component**

Copy from old project, apply:
- Glass L3 styling on toast cards
- Slide-in from right animation
- `'use client'` directive

- [ ] **Step 3: Port remaining shared components**

For each component (`FilePreviewModal`, `FileThumbnail`, `StyledQRCode`, `TurnstileWidget`, `DownloadLogsModal`, `QuickAccess`):
1. Copy from old project
2. Add `'use client'` directive
3. Update imports: `'lib/utils'` → `'@/lib/utils'`, relative paths → `@/` aliases
4. Replace `react-router-dom` usage with `next/link` and `next/navigation`
5. Apply new design tokens (colors are handled by CSS variables, so most classes carry over)

QuickAccess needs special attention - it will be integrated into the HomePage terminal hub, but the component itself should work standalone.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Footer, Toast, and shared feature components"
```

---

## Phase 4: Global Layout

### Task 11: Root layout with providers and global components

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Providers.tsx`

- [ ] **Step 1: Create Providers wrapper**

Create `src/components/Providers.tsx`:

```tsx
'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { QuickAccessUploadProvider } from '@/context/QuickAccessUploadContext';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <QuickAccessUploadProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </QuickAccessUploadProvider>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
```

Note: Context provider export names may differ from old project. Check each context file and adjust the import/component names. The old project wraps providers in `App.tsx` - replicate the same nesting order.

- [ ] **Step 2: Update root layout**

Update `src/app/layout.tsx` to include Providers, Header, Footer, InteractiveGridBg, and Toast:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InteractiveGridBg from "@/components/InteractiveGridBg";
import Toast from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareAnything",
  description: "Fast & Secure File Transfer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${GeistSans.variable} ${GeistMono.variable} dark`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans noise-overlay">
        <Providers>
          <InteractiveGridBg />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify layout renders**

```bash
npm run dev
```

Expected: Dark page with interactive dot grid, glass header with `>_ ShareAnything`, footer at bottom.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add global layout with Providers, Header, Footer, InteractiveGridBg"
```

---

## Phase 5: Pages

### Task 12: HomePage - Terminal Hub

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Build the Terminal Hub homepage**

This is a completely new page. Port the QuickAccess functionality and download code input into a single terminal-style interface.

The page should:
1. Center a large `ShareAnything.` title (Geist Bold, `text-5xl`)
2. Below it, a glass-l2 terminal box with `TerminalTabs` (upload/download)
3. Upload tab: integrate QuickAccess dropzone + file list
4. Download tab: `TerminalInput` for 6-digit code + submit button
5. No explanatory text or marketing copy
6. `/` keyboard shortcut: switch to download tab + focus input
7. `'use client'` directive

Key integration: The upload tab uses `useDropzone` and the `QuickAccess` component's logic (from `useQuickAccessUpload` context) for authenticated users. For unauthenticated users, clicking/dropping in the upload tab navigates to `/upload`.

- [ ] **Step 2: Verify homepage works**

Test:
- Upload tab shows dropzone (logged out: login prompt, logged in: drag-and-drop)
- Download tab shows terminal-style code input
- Pressing `/` switches to download tab
- Entering 6-digit code navigates to `/download/{code}`

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add HomePage with Terminal Hub interface"
```

---

### Task 13: LoginPage + Auth callback pages

**Files:**
- Create: `src/app/signin/page.tsx`
- Create: `src/app/auth/callback/[provider]/page.tsx`
- Create: `src/app/auth/email/verify-wait/page.tsx`
- Create: `src/app/auth/email/magic-link/page.tsx`

- [ ] **Step 1: Port LoginPage**

Copy old `LoginPage.tsx`, apply:
- `'use client'` directive
- Replace `react-router-dom` → `next/navigation` (`useRouter`, `usePathname`)
- Wrap form in `glass-l2 rounded-2xl p-8` card
- Keep OAuth brand colors
- Email input: use `TerminalInput` style
- `RecentLoginBubble`: keep animation, update colors

- [ ] **Step 2: Port auth callback pages**

Copy `OAuthCallbackPage`, `EmailVerifyWaitPage`, `EmailMagicLinkCallbackPage`. For each:
- `'use client'` directive
- Replace routing with `next/navigation`
- Apply new design tokens
- Use `glass-l2` card for content

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add LoginPage and auth callback pages"
```

---

### Task 14: UploadPage

**Files:**
- Create: `src/app/upload/page.tsx`
- Create: `src/components/upload/FileDropzone.tsx`
- Create: `src/components/upload/TransferSettings.tsx`
- Create: `src/components/upload/TransferTypeToggle.tsx`
- Create: `src/components/upload/UploadProgressBar.tsx`

- [ ] **Step 1: Port upload sub-components**

Copy from old project (`pages/upload/`), for each:
- `'use client'` directive
- Update imports to `@/` aliases
- Apply new styling:
  - `FileDropzone`: dashed border with `border-primary/30`, drag active: `border-primary bg-primary/5`
  - `TransferTypeToggle`: use `TerminalTabs` style
  - `TransferSettings`: `glass-l2` card, expiration buttons as terminal-style segment control
  - `UploadProgressBar`: progress bar with `bg-primary shadow-[0_0_8px_rgba(0,212,170,0.3)]`

- [ ] **Step 2: Port UploadPage**

Copy old `UploadPage.tsx`:
- `'use client'` directive
- Replace `react-router-dom` → `next/navigation`
- Wrap content in `glass-l2` card
- All business logic (multipart upload, P2P, abort controller, etc.) preserved exactly

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add UploadPage with all sub-components"
```

---

### Task 15: UploadSuccessPage

**Files:**
- Create: `src/app/upload/success/page.tsx`

- [ ] **Step 1: Port UploadSuccessPage**

Copy old `UploadSuccessPage.tsx`:
- `'use client'` directive
- Replace routing
- `glass-l2` card for main content
- Share code: `font-mono text-5xl tracking-widest` with `text-shadow: 0 0 20px rgba(0,212,170,0.3)`
- Status icons: cyan for connected/transferring, green for completed
- P2P failed dialog: uses updated Dialog (glass-l1)
- All P2P upload logic preserved exactly

- [ ] **Step 2: Commit**

```bash
git add src/app/upload/success/page.tsx
git commit -m "feat: add UploadSuccessPage with P2P status"
```

---

### Task 16: DownloadFilePage

**Files:**
- Create: `src/app/download/[code]/page.tsx`
- Create: `src/components/download/SingleFileView.tsx`
- Create: `src/components/download/MultiFileList.tsx`
- Create: `src/components/download/PasswordForm.tsx`
- Create: `src/components/download/DownloadErrorState.tsx`

- [ ] **Step 1: Port download sub-components**

Copy from old project (`pages/download/`), for each:
- `'use client'` directive
- Update imports
- `PasswordForm`: terminal-style with `>_` prompt prefix
- `SingleFileView`: `glass-l2` card, primary download button
- `MultiFileList`: `glass-l2` card, checkboxes use cyan
- `DownloadErrorState`: centered error with glass card

- [ ] **Step 2: Port DownloadFilePage**

Copy old `DownloadFilePage.tsx`:
- `'use client'` directive
- Replace routing (`useParams` from `next/navigation`)
- All download logic preserved (Turnstile, password, single/multi, P2P, ZIP)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add DownloadFilePage with all sub-components"
```

---

### Task 17: UploadHistoryPage

**Files:**
- Create: `src/app/history/page.tsx`
- Create: `src/components/history/HistoryTable.tsx`
- Create: `src/components/history/HistoryMobileCards.tsx`
- Create: `src/components/history/HistoryPagination.tsx`

- [ ] **Step 1: Port history sub-components**

Copy from old project (`pages/history/`):
- `'use client'` directive
- Update imports
- Table: `glass-l2` wrapper, `bg-surface` header, border between rows
- Mobile cards: `glass-l2` styling, hover glow
- Status badges: active=`bg-primary/10 text-primary`, expired=`bg-muted/10 text-muted`
- Pagination: use new Button variants

- [ ] **Step 2: Port UploadHistoryPage**

Copy old `UploadHistoryPage.tsx`:
- `'use client'` directive
- Replace routing
- All logic preserved (presigned URLs, download logs, QR modal, delete, pagination)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add UploadHistoryPage with table and mobile views"
```

---

### Task 18: SettingsPage

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Port SettingsPage**

Copy old `SettingsPage.tsx`:
- `'use client'` directive
- Replace `useSearchParams` from `next/navigation`
- Sidebar: `glass-l2` panel, active tab highlight with `bg-primary/10`
- Switch: uses new cyan active state
- Popover: glass-l3
- Token display: `font-mono bg-surface` code block
- All 4 tabs and their full functionality preserved

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add SettingsPage with all tabs"
```

---

### Task 19: CliPage

**Files:**
- Create: `src/app/cli/page.tsx`

- [ ] **Step 1: Port CliPage**

Copy old `CliPage.tsx`:
- `'use client'` directive
- Replace `Link` with `next/link`
- Code blocks: `bg-surface border border-border rounded-lg font-mono`
- Syntax highlighting: commands=`text-primary`, flags=`text-accent`, URLs=`text-muted`
- Tables: `glass-l2` styling
- All content and functionality preserved

- [ ] **Step 2: Commit**

```bash
git add src/app/cli/page.tsx
git commit -m "feat: add CliPage with terminal-style code blocks"
```

---

### Task 20: Remaining pages

**Files:**
- Create: `src/app/cli-signin/[sessionId]/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/privacy-policy/page.tsx`
- Create: `src/app/terms-of-use/page.tsx`

- [ ] **Step 1: Port CliSigninPage**

Copy old `CliSigninPage.tsx`:
- `'use client'` directive
- Replace routing
- Apply glass card styling

- [ ] **Step 2: Create 404 page**

Copy old `NotFoundPage.tsx`:
- `'use client'` directive
- Lottie animation preserved
- New file name: `src/app/not-found.tsx` (Next.js convention)

- [ ] **Step 3: Port legal pages**

Copy old `PrivacyPolicyPage.tsx` and `TermsOfUsePage.tsx`:
- Keep language-specific component imports
- Apply new layout styles
- `'use client'` directive

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add remaining pages (cli-signin, 404, legal)"
```

---

## Phase 6: Polish & Verification

### Task 21: Motion animations

**Files:**
- Modify: Various page and component files

- [ ] **Step 1: Add page transition wrapper**

Create `src/components/PageTransition.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

Wrap each page's content with `<PageTransition>`.

- [ ] **Step 2: Add card hover effects**

In components that render interactive cards (QuickAccess file items, history rows, homepage terminal box), add:

```tsx
<motion.div whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
  {/* card content */}
</motion.div>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Motion animations (page transitions, hover effects)"
```

---

### Task 22: Light mode refinement

**Files:**
- Modify: `src/app/globals.css`
- Modify: Various components

- [ ] **Step 1: Test and fix light mode**

Switch theme to light and verify:
- Glass classes apply light mode overrides (`:root .glass-l1` etc.)
- Text contrast is sufficient
- Primary button is readable (darker cyan in light)
- Interactive grid dots: use `rgba(0,0,0,0.05)` in light mode
- Noise overlay: reduced opacity or disabled

Fix any contrast or visibility issues found.

- [ ] **Step 2: Update InteractiveGridBg for light mode**

The component should detect theme and adjust dot colors:
- Dark: white dots
- Light: black dots with lower opacity

Add a `theme` prop or detect via CSS class on `<html>`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: refine light mode glass effects and contrast"
```

---

### Task 23: Environment variables and deployment config

**Files:**
- Create: `.env.local`
- Create: `next.config.ts`

- [ ] **Step 1: Set up environment variables**

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=https://share-api.mingyu.dev
```

Update `src/services/api.ts` to use `process.env.NEXT_PUBLIC_API_URL` (should already work if old project used `REACT_APP_API_URL` - find and replace).

- [ ] **Step 2: Configure next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Handle node: protocol imports for browser compatibility (same as old config-overrides.js)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add environment variables and Next.js config"
```

---

### Task 24: Final verification against feature checklist

**Files:**
- Reference: `docs/superpowers/specs/2026-04-14-design-renewal-spec.md` Section 10

- [ ] **Step 1: Run the app and test every feature**

```bash
npm run dev
```

Go through the complete feature checklist from the spec (Section 10), testing each item:

1. **Authentication**: OAuth buttons, email login, logout, recent login indicator
2. **File Upload**: drag-drop, file list, server/P2P toggle, progress, cancel, settings, Turnstile
3. **Upload Success**: share code, link, QR, P2P status, file list
4. **File Download**: code entry, Turnstile, password, single/multi, ZIP, P2P, preview, errors
5. **Quick Access**: upload, file list, download, delete, preview, progress
6. **Upload History**: table/mobile, expand, logs, QR, delete, pagination, skeleton
7. **Settings**: all 4 tabs with all controls
8. **CLI Page**: install methods, commands, code blocks, tables
9. **Other**: 5 languages, theme toggle, 404, legal pages, responsive, keyboard shortcuts

- [ ] **Step 2: Fix any issues found**

Address any bugs, missing features, or styling issues.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Fix any build errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete design renewal - all features verified"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Bootstrap | 1-3 | Create Next.js project, install deps, copy business logic |
| 2. Design System | 4-8 | Tailwind config, global CSS, InteractiveGridBg, UI components, terminal components |
| 3. Shared Components | 9-10 | Header, Footer, Toast, FilePreviewModal, QuickAccess, etc. |
| 4. Global Layout | 11 | Root layout with providers, grid, noise overlay |
| 5. Pages | 12-20 | All pages (Home, Login, Upload, Download, History, Settings, CLI, etc.) |
| 6. Polish | 21-24 | Animations, light mode, env config, final verification |

**Total: 24 tasks**

Key principle: All business logic (API calls, WebRTC, file handling, state management) is copied verbatim from the old project. Only UI markup and Tailwind classes change. This minimizes risk and ensures feature parity.
