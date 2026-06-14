"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PIN_VH_MULTIPLE = 3.2;
const IMMERSE_OVERFILL = 1.04;
const ENTRY_DELAY = 0.2;
const CARD_START_SCALE_DESKTOP = 0.6;
const CARD_START_SCALE_MOBILE = 0.82;

export type HeroScrubProps = {
  frameCount: number;
  frameUrl: (index: number) => string;
  titleTop: string;
  titleBottom: string;
  bgClassName?: string;
  accentHex?: string;
  defaultAspect?: number;
  badge?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export function HeroScrub({
  frameCount,
  frameUrl,
  titleTop,
  titleBottom,
  bgClassName = "bg-[#0f1418]",
  accentHex = "#89ceff",
  defaultAspect = 16 / 9,
  badge = "VISION IA — LLAVA 13B",
}: HeroScrubProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastDrawnRef = useRef<number>(-1);
  const bgRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleTopRef = useRef<HTMLHeadingElement>(null);
  const titleBottomRef = useRef<HTMLHeadingElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [framesOk, setFramesOk] = useState(true);
  const [aspect, setAspect] = useState<number>(defaultAspect);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let errored = 0;
    const images: HTMLImageElement[] = new Array(frameCount);
    imagesRef.current = images;

    const onFirstReady = (img: HTMLImageElement) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (canvas && img.naturalWidth && img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        lastDrawnRef.current = 0;
        setAspect(img.naturalWidth / img.naturalHeight);
      }
      setReady(true);
    };

    const onErr = () => {
      errored++;
      if (!cancelled && errored >= 5) setFramesOk(false);
    };

    const loadOne = (i: number) => {
      const img = new window.Image();
      img.decoding = "async";
      if (i < 4)
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
      img.onerror = onErr;
      if (i === 0) img.onload = () => onFirstReady(img);
      img.src = frameUrl(i);
      images[i] = img;
    };

    const INITIAL = Math.min(20, frameCount);
    for (let i = 0; i < INITIAL; i++) loadOne(i);

    const BATCH = 20;
    let cursor = INITIAL;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loadNext = () => {
      if (cancelled) return;
      const end = Math.min(frameCount, cursor + BATCH);
      for (let i = cursor; i < end; i++) loadOne(i);
      cursor = end;
      if (cursor < frameCount) timer = setTimeout(loadNext, 80);
    };
    timer = setTimeout(loadNext, 200);

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && !images[0]?.complete) setFramesOk(false);
    }, 4500);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
    };
  }, [reduced, frameCount, frameUrl]);

  // Entry animation
  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: ENTRY_DELAY });
      tl.from(bgRef.current, { opacity: 0, duration: 1.4, ease: "power2.out" });
      tl.from(badgeRef.current, { opacity: 0, y: -16, duration: 0.8, ease: "expo.out" }, 0.2);
      tl.from(cardRef.current, { opacity: 0, duration: 1.1, ease: "power3.out" }, 0.35);
      tl.from(titleTopRef.current, { opacity: 0, y: 30, duration: 1, ease: "expo.out" }, 0.5);
      tl.from(titleBottomRef.current, { opacity: 0, y: -30, duration: 1, ease: "expo.out" }, 0.62);
      tl.from(overlayRef.current, { opacity: 0, duration: 1, ease: "power2.out" }, 0.4);
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  // Scroll-driven choreography
  useEffect(() => {
    if (reduced || !ready || !framesOk) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const startScale = () =>
        window.innerWidth < 768 ? CARD_START_SCALE_MOBILE : CARD_START_SCALE_DESKTOP;

      const immerseScale = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const baseW = Math.min(vw * 0.96, vh * 0.72 * aspect);
        const baseH = Math.min(vh * 0.72, (vw * 0.96) / aspect);
        if (baseW <= 0 || baseH <= 0) return 1.5;
        return Math.max(vw / baseW, vh / baseH) * IMMERSE_OVERFILL;
      };

      const isLoaded = (i: number) => {
        const img = imagesRef.current[i];
        return !!img && img.complete && img.naturalWidth > 0;
      };

      const drawFrame = (index: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let useIdx = index;
        if (!isLoaded(useIdx)) {
          let found = -1;
          for (let d = 1; d < frameCount; d++) {
            if (useIdx - d >= 0 && isLoaded(useIdx - d)) { found = useIdx - d; break; }
            if (useIdx + d < frameCount && isLoaded(useIdx + d)) { found = useIdx + d; break; }
          }
          if (found === -1) return;
          useIdx = found;
        }
        if (lastDrawnRef.current === useIdx) return;
        const img = imagesRef.current[useIdx];
        const ctx2 = canvas.getContext("2d");
        if (!ctx2 || !img) return;
        ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastDrawnRef.current = useIdx;
      };

      gsap.set(cardRef.current, { scale: startScale(), transformOrigin: "50% 50%" });

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            const mapped = gsap.utils.clamp(0, 1, (p - 0.15) / 0.63);
            const frameIdx = Math.min(frameCount - 1, Math.floor(mapped * frameCount));
            drawFrame(frameIdx);
          },
        },
      });

      master.to(cardRef.current, { scale: 1, ease: "power2.out", duration: 0.15 }, 0);
      master.to(titleTopRef.current, {
        x: () => (window.innerWidth < 768 ? "-70vw" : "-60vw"),
        letterSpacing: "0.02em",
        ease: "power2.inOut",
        duration: 0.15,
      }, 0);
      master.to(titleBottomRef.current, {
        x: () => (window.innerWidth < 768 ? "70vw" : "60vw"),
        letterSpacing: "0.02em",
        ease: "power2.inOut",
        duration: 0.15,
      }, 0);
      master.to(badgeRef.current, { opacity: 0, y: -12, duration: 0.1, ease: "power1.in" }, 0);

      master.to(cardRef.current, { scale: immerseScale(), ease: "power2.in", duration: 0.63 }, 0.15);
      master.to(titleTopRef.current, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);
      master.to(titleBottomRef.current, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);

      master.to(cardRef.current, { scale: startScale(), ease: "power3.inOut", duration: 0.22 }, 0.78);
      master.to(titleTopRef.current, {
        x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
      }, 0.78);
      master.to(titleBottomRef.current, {
        x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
      }, 0.78);
      master.to(badgeRef.current, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }, 0.78);

      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, [ready, framesOk, reduced, aspect, frameCount]);

  const tallHeight = `${(PIN_VH_MULTIPLE + 1) * 100}vh`;

  return (
    <section
      ref={sectionRef}
      className={`relative w-full overflow-clip text-white ${bgClassName}`}
      style={{ height: tallHeight }}
      aria-label="Cinematic scroll-scrubbed hero — identification de pièces IA"
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(137,206,255,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        ref={stickyRef}
        className="sticky top-0 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
      >
        {/* Accent bg */}
        <div ref={bgRef} aria-hidden className="absolute inset-0 z-0" style={{ backgroundColor: "#0f1418" }} />

        {/* Radial accent glow */}
        <div aria-hidden className="absolute inset-0 z-0" style={{
          background: `radial-gradient(ellipse at 50% 40%, ${accentHex}18 0%, transparent 65%)`,
        }} />

        {/* Vignette */}
        <div aria-hidden className="absolute inset-0 z-0" style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }} />

        {/* Scan lines overlay */}
        <div ref={overlayRef} aria-hidden className="absolute inset-0 z-10 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
        }} />

        {/* Corner decorations */}
        {[
          "top-6 left-6 border-t border-l",
          "top-6 right-6 border-t border-r",
          "bottom-6 left-6 border-b border-l",
          "bottom-6 right-6 border-b border-r",
        ].map((cls, i) => (
          <div key={i} aria-hidden className={`absolute w-8 h-8 ${cls} z-20 pointer-events-none`}
            style={{ borderColor: `${accentHex}40` }} />
        ))}

        {/* Badge */}
        <div ref={badgeRef} className="absolute top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-[10px] font-bold tracking-widest"
            style={{
              background: "rgba(15,20,24,0.8)",
              borderColor: `${accentHex}30`,
              color: accentHex,
              backdropFilter: "blur(8px)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentHex }} />
            {badge}
          </div>
        </div>

        {/* HUD grid lines */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-px h-px z-10 pointer-events-none opacity-20"
          style={{ background: `linear-gradient(to right, transparent, ${accentHex}, transparent)` }} />
        <div aria-hidden className="absolute inset-y-0 left-1/2 -translate-x-px w-px z-10 pointer-events-none opacity-10"
          style={{ background: `linear-gradient(to bottom, transparent, ${accentHex}, transparent)` }} />

        <div className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-3 md:gap-4">
          {/* Title top */}
          <h1
            ref={titleTopRef}
            aria-hidden
            className="font-black uppercase tracking-[-0.04em] select-none"
            style={{
              fontSize: "clamp(3.75rem, 12vw, 11rem)",
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: "white",
              textShadow: `0 0 60px ${accentHex}40`,
            }}
          >
            {titleTop}
          </h1>

          {/* Card / Canvas */}
          <div
            ref={cardRef}
            className="relative overflow-hidden will-change-transform"
            style={{
              width: `min(96vw, calc(72svh * ${aspect}))`,
              height: `min(72svh, 96vw / ${aspect})`,
              aspectRatio: aspect,
              borderRadius: "12px",
              boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 20px 80px rgba(0,0,0,0.8), 0 0 40px ${accentHex}20`,
            }}
          >
            {/* Inner vignette */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-20"
              style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.5)" }} />

            {/* HUD corner brackets */}
            {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r",
              "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls, i) => (
              <div key={i} aria-hidden className={`absolute w-4 h-4 ${cls} z-30 pointer-events-none`}
                style={{ borderColor: `${accentHex}80` }} />
            ))}

            {/* ID badge inside card */}
            <div aria-hidden className="absolute bottom-3 right-3 z-30 font-mono text-[8px] px-1.5 py-0.5 rounded pointer-events-none"
              style={{
                background: "rgba(10,15,20,0.85)",
                color: accentHex,
                border: `1px solid ${accentHex}30`,
              }}>
              SYS:SCAN
            </div>

            {framesOk ? (
              <canvas
                ref={canvasRef}
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              /* Fallback placeholder */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ background: "#0a0f13" }}>
                <div className="p-4 rounded-full border" style={{ borderColor: `${accentHex}30` }}>
                  <svg className="h-10 w-10" style={{ color: accentHex }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-mono text-xs" style={{ color: `${accentHex}80` }}>CHARGEMENT FRAMES...</p>
              </div>
            )}
          </div>

          {/* Title bottom */}
          <h2
            ref={titleBottomRef}
            aria-hidden
            className="font-black uppercase tracking-[-0.04em] select-none"
            style={{
              fontSize: "clamp(3.75rem, 12vw, 11rem)",
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: accentHex,
              textShadow: `0 0 60px ${accentHex}60`,
            }}
          >
            {titleBottom}
          </h2>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-2 font-mono text-[9px]"
          style={{
            borderTop: `1px solid ${accentHex}15`,
            background: "rgba(10,15,20,0.6)",
            color: `${accentHex}70`,
            backdropFilter: "blur(4px)",
          }}>
          <span>SYS_STATUS: <span style={{ color: "#4ade80" }}>● ONLINE</span></span>
          <span>PIÈCES-AI — IA VISION</span>
          <span>SCROLL ↓</span>
        </div>
      </div>
    </section>
  );
}