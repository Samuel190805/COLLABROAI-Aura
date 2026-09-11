"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export const CustomCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isPrecisionZone, setIsPrecisionZone] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth springs for cursor ring
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const ringX = useSpring(cursorX, springConfig);
  const ringY = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Only run on devices with fine pointer (mouse/trackpad, not touch)
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if inside native input or precision canvas zone
      const precisionParent = target.closest(
        "input[type='range'], input[type='text'], input[type='password'], input[type='email'], textarea, canvas, [data-cursor='native']"
      );
      if (precisionParent) {
        setIsPrecisionZone(true);
        setIsHoveringInteractive(false);
        return;
      } else {
        setIsPrecisionZone(false);
      }

      // Check if hovering interactive element
      const interactiveEl = target.closest(
        "a, button, [role='button'], [data-cursor='magnetic'], [data-cursor='interactive'], .magnetic-target"
      );

      setIsHoveringInteractive(!!interactiveEl);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [cursorX, cursorY, isVisible]);

  // Don't render custom cursor on touch screens or when hidden/in precision zone
  if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
        isVisible && !isPrecisionZone ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {/* Outer Spring Ring */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isHoveringInteractive ? 1.9 : 1,
          borderColor: isHoveringInteractive ? "rgba(0, 113, 227, 0.8)" : "rgba(255, 255, 255, 0.35)",
          backgroundColor: isHoveringInteractive ? "rgba(0, 113, 227, 0.12)" : "rgba(255, 255, 255, 0.02)",
        }}
        transition={{ duration: 0.15 }}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/40 backdrop-blur-[1px]"
      />

      {/* Center Pin Dot */}
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isHoveringInteractive ? 0.6 : 1,
          backgroundColor: isHoveringInteractive ? "#2997FF" : "#FFFFFF",
        }}
        transition={{ duration: 0.1 }}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-white shadow-sm"
      />
    </div>
  );
};

export default CustomCursor;
