"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Original Mio-style mascot — a friendly blue cat wearing a headset.
 * Drawn from scratch (no copyrighted assets). Idle bob + blinking eyes,
 * with an optional animated voice-wave to its side.
 */
export function MioMascot({
  className,
  size = 200,
  withWaves = true,
}: {
  className?: string;
  size?: number;
  withWaves?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("relative inline-flex items-center", className)}
    >
      {withWaves && (
        <div className="mr-3 flex items-end gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-mio-500 animate-wave"
              style={{
                height: 14 + (i % 2 === 0 ? 16 : 28),
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="animate-bob">
        <svg
          width={size}
          height={size}
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Mio AI mascot"
        >
          <defs>
            <linearGradient id="mioBody" x1="60" y1="40" x2="180" y2="210">
              <stop offset="0" stopColor="#6b7da6" />
              <stop offset="1" stopColor="#41507a" />
            </linearGradient>
            <linearGradient id="mioSuit" x1="80" y1="170" x2="160" y2="240">
              <stop offset="0" stopColor="#1f2a44" />
              <stop offset="1" stopColor="#0f1626" />
            </linearGradient>
            <radialGradient id="mioGlow" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0" stopColor="#598aff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#598aff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft glow */}
          <circle cx="120" cy="120" r="110" fill="url(#mioGlow)" />

          {/* ears */}
          <path d="M70 70 L60 28 L104 56 Z" fill="url(#mioBody)" />
          <path d="M170 70 L180 28 L136 56 Z" fill="url(#mioBody)" />
          <path d="M74 64 L68 42 L92 56 Z" fill="#9fb0d6" />
          <path d="M166 64 L172 42 L148 56 Z" fill="#9fb0d6" />

          {/* suit shoulders */}
          <path
            d="M58 210 Q120 168 182 210 L182 240 L58 240 Z"
            fill="url(#mioSuit)"
          />
          <path d="M120 182 L108 240 L132 240 Z" fill="#e9eefb" />
          <path d="M120 186 L114 206 L120 214 L126 206 Z" fill="#2563eb" />

          {/* head */}
          <ellipse cx="120" cy="120" rx="64" ry="60" fill="url(#mioBody)" />
          {/* muzzle */}
          <ellipse cx="120" cy="140" rx="34" ry="26" fill="#aebbdd" />

          {/* eyes (blink) */}
          <g className="origin-center animate-blink" style={{ transformBox: "fill-box" }}>
            <ellipse cx="98" cy="116" rx="11" ry="13" fill="#ffffff" />
            <ellipse cx="142" cy="116" rx="11" ry="13" fill="#ffffff" />
            <circle cx="100" cy="118" r="6" fill="#1b3a8f" />
            <circle cx="144" cy="118" r="6" fill="#1b3a8f" />
            <circle cx="102" cy="115" r="2" fill="#ffffff" />
            <circle cx="146" cy="115" r="2" fill="#ffffff" />
          </g>

          {/* nose + mouth */}
          <path d="M114 134 L126 134 L120 141 Z" fill="#2a3658" />
          <path
            d="M120 141 Q112 150 104 145 M120 141 Q128 150 136 145"
            stroke="#2a3658"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* whiskers */}
          <g stroke="#cfd8ee" strokeWidth="2" strokeLinecap="round">
            <path d="M86 140 L62 134" />
            <path d="M86 146 L64 148" />
            <path d="M154 140 L178 134" />
            <path d="M154 146 L176 148" />
          </g>

          {/* headphones */}
          <path
            d="M52 122 A68 68 0 0 1 188 122"
            stroke="#10182b"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="40" y="112" width="26" height="40" rx="12" fill="#10182b" />
          <rect x="174" y="112" width="26" height="40" rx="12" fill="#10182b" />
          <rect x="46" y="120" width="14" height="24" rx="7" fill="#2563eb" />
          <rect x="180" y="120" width="14" height="24" rx="7" fill="#2563eb" />
          {/* mic boom */}
          <path
            d="M53 150 Q56 182 92 184"
            stroke="#10182b"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="96" cy="184" r="7" fill="#2563eb" />
        </svg>
      </div>
    </motion.div>
  );
}
