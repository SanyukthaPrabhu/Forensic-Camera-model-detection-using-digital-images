import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * Interactive spotlight that follows the mouse cursor.
 * Adapted from ibelick's Spotlight — no Tailwind, uses inline styles.
 */
export function Spotlight({
  size = 320,
  springOptions = { bounce: 0 },
  color = 'rgba(0, 255, 100, 0.12)',
  style,
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState(null);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  const spotlightLeft = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const spotlightTop  = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.style.position = 'relative';
        parent.style.overflow = 'hidden';
        setParentElement(parent);
      }
    }
  }, []);

  const handleMouseMove = useCallback(
    (event) => {
      if (!parentElement) return;
      const { left, top } = parentElement.getBoundingClientRect();
      mouseX.set(event.clientX - left);
      mouseY.set(event.clientY - top);
    },
    [mouseX, mouseY, parentElement]
  );

  useEffect(() => {
    if (!parentElement) return;
    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);
    parentElement.addEventListener('mousemove', handleMouseMove);
    parentElement.addEventListener('mouseenter', onEnter);
    parentElement.addEventListener('mouseleave', onLeave);
    return () => {
      parentElement.removeEventListener('mousemove', handleMouseMove);
      parentElement.removeEventListener('mouseenter', onEnter);
      parentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [parentElement, handleMouseMove]);

  return (
    <motion.div
      ref={containerRef}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        borderRadius: '50%',
        background: `radial-gradient(circle at center, ${color}, transparent 80%)`,
        filter: 'blur(24px)',
        width: size,
        height: size,
        left: spotlightLeft,
        top: spotlightTop,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
        zIndex: 1,
        ...style,
      }}
    />
  );
}

/**
 * Static SVG spotlight (Aceternity style) — used for the card background.
 * Plays an entrance animation; no mouse tracking.
 */
export function StaticSpotlight({ className, fill = '#00ff64' }) {
  return (
    <svg
      className={`spotlight-svg ${className || ''}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71" cy="273.501"
          rx="1924.71" ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.18"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.86" y="0.84"
          width="3785.16" height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
