import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/hover-lens.css';

// Realistic concentric-swirl fingerprint SVG (matches reference image style)
const FingerprintSVG = ({ stroke, style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 220"
    fill="none"
    stroke={stroke}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: '78%', height: '78%', ...style }}
  >
    {/* Core whorl center */}
    <ellipse cx="100" cy="105" rx="5" ry="5" />
    <ellipse cx="100" cy="105" rx="12" ry="11" />
    <ellipse cx="100" cy="105" rx="20" ry="18" />
    <ellipse cx="100" cy="105" rx="29" ry="26" />
    <ellipse cx="100" cy="105" rx="38" ry="34" />
    <ellipse cx="100" cy="105" rx="47" ry="42" />
    <ellipse cx="100" cy="105" rx="56" ry="50" />
    <ellipse cx="100" cy="105" rx="65" ry="58" />
    <ellipse cx="100" cy="105" rx="74" ry="66" />
    <ellipse cx="100" cy="105" rx="83" ry="74" />
    <ellipse cx="100" cy="105" rx="92" ry="82" />

    {/* Ridge breaks top — simulate arch/whorl splits */}
    {/* Top left ridge cuts */}
    <path d="M 36 52 Q 28 38 40 28" />
    <path d="M 52 38 Q 60 24 78 20" />
    {/* Top right ridge cuts */}
    <path d="M 164 52 Q 172 38 160 28" />
    <path d="M 148 38 Q 140 24 122 20" />

    {/* Bottom arch extension lines — fingerprint tip area */}
    <path d="M 17 140 Q 10 165 22 185 Q 40 205 70 210" />
    <path d="M 183 140 Q 190 165 178 185 Q 160 205 130 210" />
    <path d="M 26 155 Q 20 175 35 192 Q 52 208 80 212" />
    <path d="M 174 155 Q 180 175 165 192 Q 148 208 120 212" />
    <path d="M 70 210 Q 85 215 100 216 Q 115 215 130 210" />
    <path d="M 80 212 Q 90 217 100 218 Q 110 217 120 212" />

    {/* Extra ridge texture — left side arches */}
    <path d="M 8 100 Q 5 80 12 62" />
    <path d="M 9 118 Q 6 100 9 82" />

    {/* Extra ridge texture — right side arches */}
    <path d="M 192 100 Q 195 80 188 62" />
    <path d="M 191 118 Q 194 100 191 82" />

    {/* Delta / bifurcation hints bottom-left */}
    <path d="M 28 148 Q 18 160 22 175" />
    <path d="M 36 162 Q 28 172 32 184" />

    {/* Delta / bifurcation hints bottom-right */}
    <path d="M 172 148 Q 182 160 178 175" />
    <path d="M 164 162 Q 172 172 168 184" />
  </svg>
);

export function HoverLens({
  lensSize = 220,
  zoomFactor = 2.8,
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const THEME_COLOR = '#da1010'; // Deep red for the lines
  const RING_COLOR = '#111111'; // Pure dark ring

  return (
    <div
      className="hl-container"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Base fingerprint — black strokes on white-to-dark radial bg */}
      <div className="hl-fp-base">
        <FingerprintSVG stroke="#161616" />
      </div>

      {/* Subtle grid overlay */}
      <div className="hl-grid-overlay" />

      {/* Lens mask — zoomed green fingerprint */}
      <AnimatePresence>
        {isHovering && (
          <motion.div
            key="mask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hl-lens-wrapper"
            style={{
              maskImage: `radial-gradient(circle ${lensSize / 2}px at ${mousePos.x}px ${mousePos.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
              WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${mousePos.x}px ${mousePos.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
            }}
          >
            <div
              className="hl-zoomed-container"
              style={{
                transform: `scale(${zoomFactor})`,
                transformOrigin: `${mousePos.x}px ${mousePos.y}px`,
                backgroundColor: '#ffffff', // Clean white background inside the lens
              }}
            >
              <FingerprintSVG
                stroke={THEME_COLOR}
                style={{ strokeWidth: '2.5' }} // slightly thicker for zoomed look
              />
              <div className="hl-analysis-overlay" />
            </div>

            {/* Scanning laser */}
            <div className="hl-scan-wrap">
              <div
                className="animate-hl-scan"
                style={{
                  background: THEME_COLOR,
                  boxShadow: `0 0 12px 2px ${THEME_COLOR}`,
                  opacity: 0.3,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lens ring + UI */}
      <AnimatePresence>
        {isHovering && (
          <motion.div
            key="ring"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="hl-ring"
            style={{
              width: lensSize,
              height: lensSize,
              left: mousePos.x - lensSize / 2,
              top: mousePos.y - lensSize / 2,
              borderColor: RING_COLOR,
              borderWidth: '14px',
              borderStyle: 'solid',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Physical handle for the magnifying glass */}
            <div style={{
              position: 'absolute',
              width: '18px',
              height: '110px',
              backgroundColor: RING_COLOR,
              borderRadius: '8px',
              bottom: '-58px',
              right: '-50px',
              transform: 'rotate(-45deg)',
              transformOrigin: 'top center',
              boxShadow: '0 5px 15px rgba(0,0,0,0.4)',
              zIndex: -1,
            }} />

            {/* Crosshairs & UI matching the deep red theme */}
            <div className="hl-crosshair-h" style={{ background: 'rgba(218,16,16,0.3)', width: 'calc(100% + 28px)' }} />
            <div className="hl-crosshair-v" style={{ background: 'rgba(218,16,16,0.3)', height: 'calc(100% + 28px)' }} />

            <div
              className="hl-text-box hl-pulse"
              style={{ color: THEME_COLOR, borderColor: 'rgba(218,16,16,0.35)', background: 'rgba(255,255,255,0.9)' }}
            >
              ANALYZING NOISE PATTERN...
            </div>

            <div
              style={{
                marginTop: '6px',
                fontSize: '10px',
                color: THEME_COLOR,
                fontFamily: 'monospace',
                background: 'rgba(255,255,255,0.9)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                border: '1px solid rgba(218,16,16,0.1)'
              }}
            >
              X:{Math.round(mousePos.x)} Y:{Math.round(mousePos.y)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle hint */}
      {!isHovering && (
        <div className="hl-idle-hint" style={{ color: '#da1010' }}>
          [ HOVER TO INVESTIGATE FINGERPRINT ]
        </div>
      )}
    </div>
  );
}