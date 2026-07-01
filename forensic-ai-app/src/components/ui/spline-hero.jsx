import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SplineScene } from './spline-scene';
import { Spotlight, StaticSpotlight } from './spotlight';
import '../../styles/spline-hero.css';

// ── Typing animation hook ──────────────────────────────────────
function useTypingEffect(lines, speed = 38) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [displayed, setDisplayed] = useState(['']);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    if (charIdx < lines[lineIdx].length) {
      const t = setTimeout(() => {
        setDisplayed((d) => {
          const next = [...d];
          next[lineIdx] = lines[lineIdx].slice(0, charIdx + 1);
          return next;
        });
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else if (lineIdx < lines.length - 1) {
      const t = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
        setDisplayed((d) => [...d, '']);
      }, 260);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines, speed]);

  return displayed;
}

// ── Mini terminal in hero ──────────────────────────────────────
const BOOT_LINES = [
  '> FORENSIC ENGINE v4.2.1 — INITIALIZING',
  '> PRNU NOISE MODELS................[OK]',
  '> DEEPFAKE CLASSIFIER v3.1........[OK]',
  '> AI GENERATOR DETECTOR...........[OK]',
  '> ALL SYSTEMS OPERATIONAL',
];

function MiniTerminal() {
  const [vis, setVis] = useState([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    BOOT_LINES.forEach((_, i) =>
      setTimeout(() => {
        setVis((p) => [...p, i]);
        if (i === BOOT_LINES.length - 1) setDone(true);
      }, i * 480 + 600)
    );
  }, []);

  return (
    <div className="sh-terminal">
      <div className="sh-terminal-bar">
        <span className="sh-dot sh-dot-r" /><span className="sh-dot sh-dot-y" /><span className="sh-dot sh-dot-g" />
        <span className="sh-terminal-title">forensic_ai — boot</span>
      </div>
      <div className="sh-terminal-body">
        {BOOT_LINES.map((l, i) =>
          vis.includes(i) ? (
            <motion.div
              key={i}
              className={`sh-tline ${i === BOOT_LINES.length - 1 ? 'sh-tline--green' : 'sh-tline--dim'}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {l}
              {i === BOOT_LINES.length - 1 && done && <span className="sh-cursor" />}
            </motion.div>
          ) : null
        )}
      </div>
    </div>
  );
}

// ── Feature pill ───────────────────────────────────────────────
function FeaturePill({ icon, label, sub, color }) {
  return (
    <motion.div
      className="sh-pill"
      style={{ '--pill-color': color, '--pill-rgb': color === '#00ff64' ? '0,255,100' : color === '#ff4466' ? '255,68,102' : '217,70,239' }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="sh-pill-icon">{icon}</div>
      <div>
        <div className="sh-pill-label">{label}</div>
        <div className="sh-pill-sub">{sub}</div>
      </div>
      <div className="sh-pill-arrow">→</div>
    </motion.div>
  );
}

// ── Scan badge (animated confidence) ──────────────────────────
function ScanBadge() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPct(98.7), 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="sh-scan-badge">
      <div className="sh-scan-header">
        <span className="sh-scan-dot" /><span className="sh-scan-label">LIVE ANALYSIS</span>
      </div>
      <div className="sh-scan-stat">{pct.toFixed(1)}%</div>
      <div className="sh-scan-sub">Detection confidence</div>
      <div className="sh-scan-bar-wrap">
        <motion.div
          className="sh-scan-bar"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.8, delay: 1.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Main SplineHero ────────────────────────────────────────────
export function SplineHero() {
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="sh-root">
      {/* Static spotlight SVG glow */}
      <StaticSpotlight className="sh-static-spotlight" fill="#00ff64" />

      {/* Scanlines overlay */}
      <div className="sh-scanlines" />
      <div className="sh-grid-overlay" />

      {/* Animated top case-bar */}
      <motion.div
        className="sh-casebar"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.55 }}
      >
        <span className="sh-cb-dot" /><span className="sh-cb-tag">CASE FILE</span>
        <span className="sh-cb-sep">|</span>
        <span>FORENSIC-AI UNIT</span>
        <span className="sh-cb-sep">|</span>
        <span>DATE: {new Date().toISOString().slice(0, 10)}</span>
        <span className="sh-cb-sep">|</span>
        <span className="sh-cb-active">● ACTIVE</span>
      </motion.div>

      {/* Content grid */}
      <div className="sh-grid">
        {/* ── LEFT: Text content ── */}
        <motion.div
          className="sh-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.75, ease: 'easeOut' }}
        >
          {/* Interactive spotlight on left panel */}
          <Spotlight color="rgba(0,255,100,0.10)" size={350} />

          {/* Badge */}
          <motion.div
            className="sh-badge"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <span className="sh-live-dot" />
            DIGITAL FORENSICS · IMAGE AUTH · AI ANALYSIS
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="sh-h1"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            <span className="sh-h1-white">Every Pixel</span>
            <br />
            <span className="sh-h1-green">Leaves Evidence.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="sh-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
          >
            ForensicAI is an AI-powered image forensics platform. Upload any image
            and our engine extracts invisible sensor fingerprints, detects
            deepfakes, AI-generated content, and insurance fraud — delivering a
            court-grade evidence report in under 2 seconds.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="sh-pills"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25 }}
          >
            <FeaturePill
              color="#00ff64"
              label="Camera Model Detection"
              sub="PRNU sensor noise fingerprinting"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              }
            />
            <FeaturePill
              color="#ff4466"
              label="AI Forgery & Deepfake Detection"
              sub="GAN signatures + pixel-level artifacts"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              }
            />
            <FeaturePill
              color="#d946ef"
              label="AI Generated Image Detection"
              sub="Stable Diffusion · DALL·E · Midjourney"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              }
            />
          </motion.div>

          {/* Tags */}
          <motion.div
            className="sh-tags"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            {['PRNU Analysis', 'ELA Detection', 'GAN Artifacts', 'Insurance Fraud', 'Deepfake ID'].map((t) => (
              <span key={t} className="sh-tag">{t}</span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="sh-ctas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
          >
            <motion.button
              className="sh-btn sh-btn-solid"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/camera-detection')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Identify Camera
            </motion.button>
            <motion.button
              className="sh-btn sh-btn-outline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/fake-detection')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              Verify Authenticity
            </motion.button>
          </motion.div>

          {/* Mini terminal */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.85 }}
          >
            <MiniTerminal />
          </motion.div>
        </motion.div>

        {/* ── RIGHT: Spline 3D + scan badge ── */}
        <motion.div
          className="sh-right"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
        >
          {/* Interactive spotlight on right panel */}
          <Spotlight color="rgba(0,200,255,0.08)" size={400} />

          {/* Scan reticle corners */}
          <div className="sh-reticle-tl" /><div className="sh-reticle-tr" />
          <div className="sh-reticle-bl" /><div className="sh-reticle-br" />

          {/* Spline 3D Scene */}
          <div className="sh-spline-wrap">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>

          {/* Floating scan badge */}
          <motion.div
            className="sh-badge-float"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 2.0, type: 'spring', stiffness: 200 }}
          >
            <ScanBadge />
          </motion.div>

          {/* Status chip */}
          <motion.div
            className="sh-status-chip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.3 }}
          >
            <span className="sh-live-dot" />
            <span>SYSTEM ONLINE</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom evidence tape */}
      <div className="sh-tape-wrap">
        <div className="sh-tape-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="sh-tape-text">
              DO NOT CROSS — FORENSIC EVIDENCE — RESTRICTED ZONE —&nbsp;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
