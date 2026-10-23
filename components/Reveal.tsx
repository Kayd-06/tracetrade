"use client";
import type { ReactNode } from "react";
import { useInView } from "@/hooks/useMotion";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  return (
    <div ref={ref} className={`reveal ${inView ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Card with a soft radial glow that follows the cursor. */
export function GlowCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`); }}
      className={`glow-card group relative overflow-hidden rounded-xl border border-line bg-panel/70 ${className}`}
    >
      {children}
    </div>
  );
}
