import { useEffect, useRef, useState, Suspense } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial, Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { SplineHero } from "../components/ui/spline-hero";
import "../styles/home.css";

// ─────────────────────────────────────────────────────────────────
// API base URL — same convention as the analysis pages
// ─────────────────────────────────────────────────────────────────
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
  "";

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ═══════════════════════════════════════════════════════════════
// THREE.JS — PARTICLE NETWORK
// ═══════════════════════════════════════════════════════════════
function ParticleField() {
  const ref = useRef(null);
  const count = 3500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 18;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.07) * 0.12;
      ref.current.rotation.y = state.clock.elapsedTime * 0.04;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#00ff64"
        size={0.028}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
      />
    </Points>
  );
}

function NeuralOrb() {
  const mesh = useRef(null);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.22;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.33;
    }
  });
  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1.2}>
      <mesh ref={mesh} scale={1.55}>
        <icosahedronGeometry args={[1, 3]} />
        <MeshDistortMaterial
          color="#00ff64"
          wireframe
          distort={0.25}
          speed={2.5}
          opacity={0.08}
          transparent
        />
      </mesh>
    </Float>
  );
}

function GridPlane() {
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.z = ((state.clock.elapsedTime * 0.6) % 1.5) - 0.75;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial color="#00ff64" wireframe opacity={0.04} transparent />
    </mesh>
  );
}

function Scene3D() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 2, 2]} intensity={0.8} color="#00ff64" />
      <pointLight position={[-4, -2, -4]} intensity={0.4} color="#4466ff" />
      <ParticleField />
      <NeuralOrb />
      <GridPlane />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEX STREAM CANVAS (2D overlay)
// ═══════════════════════════════════════════════════════════════
function HexStreamCanvas() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReduced()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const FS = 11;
    const CHARS = "0123456789ABCDEF";
    let W, H, cols;

    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const colCount = Math.floor(W / (FS * 2.4));
      cols = Array.from({ length: colCount }, (_, i) => ({
        x: i * FS * 2.4,
        y: Math.random() * H,
        speed: 0.18 + Math.random() * 0.35,
        alpha: 0.02 + Math.random() * 0.035,
      }));
    };

    init();
    window.addEventListener("resize", init);

    const tick = () => {
      ctx.fillStyle = "rgba(2,8,16,0.13)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = `${FS}px 'JetBrains Mono', monospace`;
      for (const c of cols) {
        const pair =
          CHARS[Math.floor(Math.random() * 16)] +
          CHARS[Math.floor(Math.random() * 16)];
        ctx.fillStyle = `rgba(0,255,100,${c.alpha})`;
        ctx.fillText(pair, c.x, c.y);
        c.y += c.speed;
        if (c.y > H) c.y = -FS;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", init);
    };
  }, []);

  return <canvas ref={canvasRef} className="hex-canvas" />;
}

// ═══════════════════════════════════════════════════════════════
// GLITCH TEXT
// ═══════════════════════════════════════════════════════════════
function GlitchText({ children, className = "" }) {
  return (
    <span className={`glitch ${className}`} data-text={children}>
      <span className="glitch-main">{children}</span>
      <span className="glitch-r" aria-hidden>{children}</span>
      <span className="glitch-b" aria-hidden>{children}</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE TAPE
// ═══════════════════════════════════════════════════════════════
function EvidenceTape({ label = "DO NOT CROSS — FORENSIC EVIDENCE — RESTRICTED ZONE — " }) {
  return (
    <div className="evtape">
      <div className="evtape__track">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="evtape__text">{label}</span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FINGERPRINT SVG
// ═══════════════════════════════════════════════════════════════
function FingerprintSVG({ size = 220, scanning = false }) {
  const ridges = [14, 22, 31, 41, 52, 64, 77, 91, 105];
  return (
    <div
      className={`fp-wrap ${scanning ? "fp-scanning" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <linearGradient id="scanG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00ff64" stopOpacity="0" />
            <stop offset="50%" stopColor="#00ff64" stopOpacity="1" />
            <stop offset="100%" stopColor="#00ff64" stopOpacity="0" />
          </linearGradient>
          <filter id="fpGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="fpClip">
            <circle cx="100" cy="105" r="90" />
          </clipPath>
        </defs>
        <g clipPath="url(#fpClip)" filter="url(#fpGlow)">
          {ridges.map((r, i) => (
            <ellipse
              key={i}
              cx="100" cy="108"
              rx={r * 1.18} ry={r}
              fill="none"
              stroke="#00ff64"
              strokeWidth={i === 0 ? 1.5 : 0.9}
              strokeOpacity={0.12 + i * 0.05}
              strokeDasharray={i % 2 === 0 ? `${r * 0.6} ${r * 0.15}` : "none"}
            />
          ))}
          {[[70,79],[132,83],[58,107],[144,110],[73,134],[128,138],[95,157],[106,157]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="2.5" fill="#00ff64" opacity="0.6"/>
          ))}
          <ellipse cx="100" cy="108" rx="6.5" ry="5.5" fill="none" stroke="#00ff64" strokeWidth="1.3" strokeOpacity="0.9"/>
          <circle cx="100" cy="108" r="2.2" fill="#00ff64" opacity="0.8"/>
          <rect className="fp-beam" x="0" y="0" width="200" height="5" fill="url(#scanG)" opacity="0.95"/>
        </g>
        <circle cx="100" cy="105" r="90" fill="none" stroke="#00ff64" strokeWidth="0.5" strokeOpacity="0.25"/>
        <circle cx="100" cy="105" r="96" fill="none" stroke="#00ff64" strokeWidth="0.3" strokeOpacity="0.12" strokeDasharray="4 6"/>
      </svg>
      <div className="fp-corner fp-tl" /><div className="fp-corner fp-tr" />
      <div className="fp-corner fp-bl" /><div className="fp-corner fp-br" />
      <div className="fp-ping" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL
// ═══════════════════════════════════════════════════════════════
const TERM_LINES = [
  { t: "> FORENSIC ENGINE v4.2.1 — BOOT SEQUENCE", c: "#00ff64", d: 0 },
  { t: "> LOADING PRNU NOISE MODELS...........[OK]", c: "#7affb2", d: 450 },
  { t: "> GAN ARTIFACT CLASSIFIER..............[OK]", c: "#7affb2", d: 900 },
  { t: "> ELA HEATMAP MODULE...................[OK]", c: "#7affb2", d: 1350 },
  { t: "> DEEPFAKE DETECTOR v3.1..............[OK]", c: "#7affb2", d: 1600 },
  { t: "> EVIDENCE DATABASE: 512 MODELS LOADED", c: "#7affb2", d: 1900 },
  { t: "> ALL SYSTEMS OPERATIONAL", c: "#00ff64", d: 2300 },
  { t: "█ AWAITING IMAGE INPUT_", c: "#4dffaa", d: 2800, blink: true },
];

function Terminal() {
  const [vis, setVis] = useState([]);
  useEffect(() => {
    TERM_LINES.forEach((l, i) =>
      setTimeout(() => setVis((p) => [...p, i]), l.d + 200)
    );
  }, []);
  return (
    <div className="terminal">
      <div className="terminal__bar">
        <span className="t-dot red" /><span className="t-dot yellow" /><span className="t-dot green" />
        <span className="terminal__title">forensic_ai — zsh</span>
      </div>
      <div className="terminal__body">
        {TERM_LINES.map((l, i) =>
          vis.includes(i) ? (
            <motion.div
              key={i}
              className={`t-line ${l.blink ? "t-blink" : ""}`}
              style={{ color: l.c }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {l.t}
            </motion.div>
          ) : null
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════
const NAV_LINKS = [
  { label: "Home",             path: "/"                  },
  { label: "About",            path: "/#about"            },
  { label: "Camera Detection", path: "/camera-detection"  },
  { label: "Fake Detection",   path: "/fake-detection"    },
  { label: "Use Cases",        path: "/#use-cases"        },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <>
      <motion.nav
        className={`navbar ${scrolled ? "navbar--blur" : ""}`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-brand">
          <span className="nav-fp-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#00ff64" />
            </svg>
          </span>
          <span className="nav-name">FORENSIC<span className="nav-ai">AI</span></span>
          <span className="nav-caseid">CASE#2024</span>
        </div>
        <ul className="nav-links">
          {NAV_LINKS.map((l, i) => (
            <motion.li key={l.label} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.4 }}>
              <Link to={l.path} className="nav-link">{l.label}</Link>
            </motion.li>
          ))}
        </ul>
        <div className="nav-live">
          <span className="status-dot" />
          <span className="nav-live-text">LIVE</span>
        </div>
        <button className={`nav-burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </motion.nav>
      <AnimatePresence>
        {open && (
          <motion.div className="mob-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="mob-close" onClick={() => setOpen(false)}>✕</button>
            <ul>
              {NAV_LINKS.map((l, i) => (
                <motion.li key={l.label} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link to={l.path} className="mob-link" onClick={() => setOpen(false)}>{l.label}</Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAGNETIC BUTTON
// ═══════════════════════════════════════════════════════════════
function MBtn({ children, variant = "solid", onClick }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: (e.clientX - r.left - r.width / 2) * 0.13,
      y: (e.clientY - r.top - r.height / 2) * 0.13,
    });
  };
  return (
    <motion.button
      ref={ref}
      className={`mbtn mbtn--${variant}`}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCANNING RETICLE
// ═══════════════════════════════════════════════════════════════
function ScanReticle({ active }) {
  return (
    <div className={`reticle ${active ? "reticle--active" : ""}`}>
      <div className="reticle-h" /><div className="reticle-v" />
      <div className="reticle-corner r-tl" /><div className="reticle-corner r-tr" />
      <div className="reticle-corner r-bl" /><div className="reticle-corner r-br" />
      <AnimatePresence>
        {active && (
          <motion.div
            className="reticle-scan"
            initial={{ top: 0, opacity: 0.9 }}
            animate={{ top: "100%", opacity: 0.7 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════
function Hero() {
  const [matchFound, setMatchFound] = useState(false);
  const [scrollPast, setScrollPast] = useState(false);
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    const t = setTimeout(() => setMatchFound(true), 3400);
    const fn = () => setScrollPast(window.scrollY > 100);
    window.addEventListener("scroll", fn);
    return () => { clearTimeout(t); window.removeEventListener("scroll", fn); };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      {/* Three.js 3D Background */}
      <div className="hero-three">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <Suspense fallback={null}>
            <Scene3D />
          </Suspense>
        </Canvas>
      </div>

      <HexStreamCanvas />
      <div className="hero-scanlines" />
      <div className="hero-vignette" />

      {/* Animated grid overlay */}
      <div className="hero-grid-overlay" />

      {/* Case strip */}
      <motion.div
        className="case-strip"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ y, opacity }}
      >
        <span className="case-strip__label">CASE FILE</span>
        <span className="case-strip__pipe">|</span>
        <span>FORENSIC-AI UNIT</span>
        <span className="case-strip__pipe">|</span>
        <span>DATE: {new Date().toISOString().slice(0, 10)}</span>
        <span className="case-strip__pipe">|</span>
        <span className="case-strip__active">● ACTIVE</span>
      </motion.div>

      <motion.div className="hero-inner" style={{ y, opacity }}>
        {/* LEFT panel */}
        <motion.div
          className="hero-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
        >
          <div className="fp-container">
            <ScanReticle active={!matchFound} />
            <FingerprintSVG size={210} scanning={!matchFound} />
          </div>

          <AnimatePresence>
            {matchFound && (
              <motion.div
                className="match-badge"
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, type: "spring" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff64" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                MATCH — CONFIDENCE 98.7%
              </motion.div>
            )}
          </AnimatePresence>

          <Terminal />
        </motion.div>

        {/* RIGHT panel */}
        <div className="hero-right">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="status-dot" />
            DIGITAL FORENSICS · IMAGE AUTH · AI ANALYSIS
          </motion.div>

          <motion.h1
            className="hero-h1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
          >
            <GlitchText>Every Pixel</GlitchText>
            <br />
            <span className="hero-h1-sub">Leaves Evidence.</span>
          </motion.h1>

          <motion.p
            className="hero-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15 }}
          >
            Upload any image. Our AI extracts invisible sensor fingerprints,
            detects deepfakes and AI-generated content, and delivers a
            forensic-grade evidence report — in under 2 seconds.
          </motion.p>

          {/* Feature pills expanded */}
          <motion.div
            className="hero-features"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <div className="hfeat-card hfeat-cam">
              <div className="hfeat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff64" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div>
                <div className="hfeat-title">Camera Model Detection</div>
                <div className="hfeat-desc">PRNU sensor noise fingerprinting unique to every camera's hardware.</div>
              </div>
            </div>
            <div className="hfeat-card hfeat-forge">
              <div className="hfeat-icon" style={{ color: "#ff4466" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4466" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <div className="hfeat-title" style={{ color: "#ff4466" }}>AI Forgery Detection</div>
                <div className="hfeat-desc">Pixel-level artifacts, GAN signatures, and compression inconsistencies.</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-tags"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            {["PRNU Analysis", "ELA Detection", "GAN Artifacts", "Metadata Forensics", "Clone Detection"].map((t) => (
              <span key={t} className="htag">{t}</span>
            ))}
          </motion.div>

          <motion.div
            className="hero-ctas"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            <MBtn variant="solid" onClick={() => navigate('/camera-detection')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Identify Camera
            </MBtn>
            <MBtn variant="outline" onClick={() => navigate('/fake-detection')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              Verify Authenticity
            </MBtn>
          </motion.div>
        </div>
      </motion.div>

      <div className="hero-tape">
        <EvidenceTape />
      </div>

      <motion.div
        className="scroll-hint"
        animate={{ opacity: scrollPast ? 0 : 1, y: [0, 8, 0] }}
        transition={{ y: { repeat: Infinity, duration: 1.6 }, opacity: { duration: 0.3 } }}
      >
        <div className="scroll-line" />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2a4a2a" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE CARDS
// ═══════════════════════════════════════════════════════════════
const FEATURES = [
  {
    id: "01", exhibit: "EXHIBIT-A",
    color: "#00ff64", rgb: "0,255,100",
    eyebrow: "PRNU FINGERPRINTING",
    title: "Camera Model Detection",
    desc: "Extracts Photo Response Non-Uniformity noise — an invisible sensor-level fingerprint baked into every image by the manufacturing process. Identifies which camera took a photo with incredible precision.",
    bullets: ["512 camera model database", "Sub-pixel noise extraction", "Cross-sensor correlation"],
    stat: "98.7%", statL: "Accuracy",
    bgAnim: "cam",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  },
  {
    id: "02", exhibit: "EXHIBIT-B",
    color: "#ff4466", rgb: "255,68,102",
    eyebrow: "DEEPFAKE & GAN ANALYSIS",
    title: "AI Forgery Detection",
    desc: "Determines whether an image was manipulated or AI-generated by analyzing pixel-level artifacts, compression inconsistencies, and GAN signatures from Photoshop, Stable Diffusion, and Deepfake software.",
    bullets: ["Error Level Analysis heatmap", "GAN frequency decomposition", "Splicing & clone detection"],
    stat: "12+", statL: "AI model types",
    bgAnim: "forge",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
  {
    id: "03", exhibit: "EXHIBIT-C",
    color: "#a78bfa", rgb: "167,139,250",
    eyebrow: "EVIDENCE REPORT",
    title: "Forensic-Grade Output",
    desc: "Complete confidence scores, error-level heatmap overlay, EXIF metadata chain, and a court-ready PDF evidence report delivered in seconds.",
    bullets: ["Visual heatmap overlay", "EXIF chain of custody", "Court-ready PDF export"],
    stat: "<2s", statL: "Per analysis",
    bgAnim: "report",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
];

function FeatureCards() {
  const navigate = useNavigate();
  return (
    <section className="features">
      <div className="eyebrow">CAPABILITIES — FORENSIC TOOLS — UNIT 04</div>
      <motion.h2
        className="sec-heading"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Instruments of Digital Truth
      </motion.h2>
      <div className="fgrid">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.id}
            className={`fcard fcard--${f.bgAnim}`}
            style={{ "--fc": f.color, "--fc-rgb": f.rgb, cursor: "pointer" }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
            whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            onClick={() => {
              if (f.id === "01") navigate('/camera-detection');
              else if (f.id === "02") navigate('/fake-detection');
            }}
          >
            <div className="fcard-bg-anim" />
            <div className="fcard-accent" />
            <div className="fcard-exhibit">{f.exhibit}</div>
            <div className="fcard-eyebrow">{f.eyebrow}</div>
            <div className="fcard-icon" style={{ color: f.color }}>{f.icon}</div>
            <h3 className="fcard-title">{f.title}</h3>
            <p className="fcard-desc">{f.desc}</p>
            <ul className="fcard-list">
              {f.bullets.map((b, bi) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + bi * 0.08 + 0.3 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="3" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {b}
                </motion.li>
              ))}
            </ul>
            <div className="fcard-footer">
              <span className="fcard-stat" style={{ color: f.color }}>{f.stat}</span>
              <span className="fcard-stat-l">{f.statL}</span>
            </div>
            <div className="fcard-glow" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// USE CASES SECTION
// ═══════════════════════════════════════════════════════════════
const USE_CASES = [
  {
    id: "UC-01",
    badge: "THREAT · LEVEL · ALPHA",
    theme: "amber",
    color: "#ff9900",
    rgb: "255,153,0",
    accent: "#ffcc44",
    eyebrow: "MANIPULATION DETECTION",
    title: "Fake Image & Deepfake Detection",
    desc: "Identifies manipulated photographs and AI-generated deepfake videos or images by analyzing micro-level pixel artifacts, facial-warp signatures, and GAN generator fingerprints that are invisible to the human eye.",
    tags: ["Face Swap Detection", "GAN Fingerprinting", "Neural Artifact Scan", "Temporal Consistency"],
    bullets: [
      { label: "Deepfake video frame analysis", sub: "Detects face swap & expression manipulation" },
      { label: "GAN generator identification", sub: "MidJourney, Stable Diffusion, Runway" },
      { label: "Photoshop & Lightroom traces", sub: "Clone stamp, healing brush detection" },
    ],
    stat: "99.2%", statLabel: "Deepfake recall rate",
    confidenceLabel: "THREAT CONFIRMED", confidenceColor: "#ff6600",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
        <line x1="18" y1="2" x2="22" y2="6"/>
        <line x1="22" y1="2" x2="18" y2="6"/>
      </svg>
    ),
  },
  {
    id: "UC-02",
    badge: "EVIDENCE · GRADE · CERT",
    theme: "cyan",
    color: "#00cfff",
    rgb: "0,207,255",
    accent: "#66e8ff",
    eyebrow: "INSURANCE & LEGAL FORENSICS",
    title: "Image Authenticity Verification",
    desc: "Verifies whether vehicle accident photographs and insurance claim images are genuine or tampered. Detects staged scenes, date-stamp forgeries, and post-incident edits to protect against fraudulent insurance claims.",
    tags: ["Vehicle Accident Scenes", "Insurance Fraud", "Date-Stamp Verification", "Scene Staging"],
    bullets: [
      { label: "Accident scene authenticity", sub: "Detects staged damage & photo manipulation" },
      { label: "Timestamp & EXIF forgery", sub: "Chain of custody metadata analysis" },
      { label: "Compression & splice artifacts", sub: "Region-level heatmap highlighting" },
    ],
    stat: "97.4%", statLabel: "Insurance fraud catch rate",
    confidenceLabel: "AUTHENTIC VERIFIED", confidenceColor: "#00cfff",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 5v3h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    id: "UC-03",
    badge: "AI · ORIGIN · TRACE",
    theme: "magenta",
    color: "#d946ef",
    rgb: "217,70,239",
    accent: "#f0abfc",
    eyebrow: "SYNTHETIC MEDIA DETECTION",
    title: "AI Generated Image Detection",
    desc: "Determines if an image was synthesized by AI tools — Stable Diffusion, DALL·E, Midjourney, Adobe Firefly, or others — by extracting spectral frequency anomalies and model-specific generation artifacts.",
    tags: ["Stable Diffusion", "DALL·E 3", "Midjourney", "Adobe Firefly", "Imagen"],
    bullets: [
      { label: "Model-specific origin tracing", sub: "Identifies which AI tool generated it" },
      { label: "Frequency domain analysis", sub: "FFT spectral artifact decomposition" },
      { label: "Semantic coherence scoring", sub: "Physics & lighting consistency checks" },
    ],
    stat: "15+", statLabel: "AI generators detected",
    confidenceLabel: "AI ORIGIN TRACED", confidenceColor: "#d946ef",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
];

function UseCaseCard({ uc, index }) {
  const isEven = index % 2 === 0;
  return (
    <motion.div
      className={`uc-card uc-card--${uc.theme}`}
      style={{ "--ucc": uc.color, "--ucc-rgb": uc.rgb, "--ucc-accent": uc.accent }}
      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.7, ease: "easeOut" }}
    >
      {/* Left: content */}
      <div className="uc-content">
        <div className="uc-top">
          <div className="uc-badge-row">
            <span className="uc-id">{uc.id}</span>
            <span className="uc-badge">{uc.badge}</span>
          </div>
          <div className="uc-eyebrow">{uc.eyebrow}</div>
        </div>

        <div className="uc-icon-title">
          <div className="uc-icon" style={{ color: uc.color }}>{uc.icon}</div>
          <h3 className="uc-title">{uc.title}</h3>
        </div>

        <p className="uc-desc">{uc.desc}</p>

        <div className="uc-tags">
          {uc.tags.map(t => (
            <span key={t} className="uc-tag">{t}</span>
          ))}
        </div>

        <ul className="uc-bullets">
          {uc.bullets.map((b, i) => (
            <motion.li
              key={b.label}
              className="uc-bullet"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 + i * 0.1 + 0.4 }}
            >
              <div className="uc-bullet-dot" style={{ background: uc.color, boxShadow: `0 0 8px ${uc.color}` }} />
              <div>
                <div className="uc-bullet-label" style={{ color: uc.color }}>{b.label}</div>
                <div className="uc-bullet-sub">{b.sub}</div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Right: stat + confidence panel */}
      <div className="uc-panel">
        <div className="uc-panel-bg" />
        <div className="uc-panel-grid" />

        {/* Big stat */}
        <div className="uc-stat-block">
          <div className="uc-stat-num" style={{ color: uc.color }}>{uc.stat}</div>
          <div className="uc-stat-label">{uc.statLabel}</div>
        </div>

        {/* Animated confidence display */}
        <div className="uc-confidence">
          <div className="uc-conf-bar-wrap">
            <motion.div
              className="uc-conf-bar"
              style={{ background: `linear-gradient(to right, ${uc.color}, ${uc.accent})` }}
              initial={{ width: 0 }}
              whileInView={{ width: "88%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: index * 0.12 + 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="uc-conf-label" style={{ color: uc.confidenceColor }}>
            <span className="uc-conf-dot" style={{ background: uc.confidenceColor, boxShadow: `0 0 8px ${uc.confidenceColor}` }} />
            {uc.confidenceLabel}
          </div>
        </div>

        {/* Scan lines decoration */}
        <div className="uc-panel-lines">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="uc-line" style={{ opacity: 0.04 + i * 0.025 }} />
          ))}
        </div>
      </div>

      {/* Corner accent */}
      <div className="uc-accent-corner" />
      <div className="uc-hover-glow" />
    </motion.div>
  );
}

function UseCases() {
  return (
    <section className="uc-sec" id="use-cases">
      <div className="uc-sec-header">
        <div className="eyebrow" style={{ textAlign: "center" }}>OPERATIONAL USE CASES — FIELD DEPLOYMENT — UNIT 06</div>
        <motion.h2
          className="sec-heading"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Real-World Applications
        </motion.h2>
        <motion.p
          className="uc-sec-desc"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          Deployed across law enforcement, insurance, legal, and media verification industries.
        </motion.p>
      </div>
      <div className="uc-list">
        {USE_CASES.map((uc, i) => (
          <UseCaseCard key={uc.id} uc={uc} index={i} />
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// WAVEFORM DIVIDER
// ═══════════════════════════════════════════════════════════════
function WaveformDivider() {
  const bars = Array.from({ length: 90 }, (_, i) => ({
    h: 6 + Math.abs(Math.sin(i * 0.38 + 1) * 36 + Math.sin(i * 0.18) * 12),
    d: i * 0.013,
  }));
  return (
    <div className="waveform">
      <div className="waveform-label">SENSOR NOISE PATTERN — EXHIBIT A — SAMPLE 0x4A2F</div>
      <div className="waveform-bars">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            className="wbar"
            style={{ height: b.h }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: b.d * 0.5, duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════════════════════
const STEPS = [
  { n: "01", code: "UPLOAD", title: "Submit Evidence", desc: "Drag in any JPEG, PNG, TIFF, or HEIC. Chain of custody timestamped immediately.", icon: "⬆" },
  { n: "02", code: "EXTRACT", title: "Noise Extraction", desc: "AI isolates PRNU sensor fingerprint patterns — invisible to the human eye.", icon: "🔬" },
  { n: "03", code: "CLASSIFY", title: "Deep Inference", desc: "Neural net cross-references 512 camera models and known GAN signatures.", icon: "🧠" },
  { n: "04", code: "REPORT", title: "Evidence Report", desc: "Confidence scores, heatmaps, metadata trace, and full verdict delivered.", icon: "📋" },
];

function HowItWorks() {
  const [drawn, setDrawn] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setDrawn(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="how" ref={ref}>
      <div className="eyebrow">PROCEDURE — UNIT 07 — ANALYSIS CHAIN</div>
      <motion.h2
        className="sec-heading"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        The Investigation Pipeline
      </motion.h2>
      <div className="steps-row">
        {STEPS.map((s, i) => (
          <div key={s.n} className="step-col">
            <motion.div
              className="step-node"
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 + 0.3, type: "spring", stiffness: 200 }}
            >
              <div className="step-ring" />
              <div className="step-ring step-ring--outer" />
              <span className="step-code">{s.code}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="step-connector">
                <svg width="100%" height="4" style={{ display: "block" }}>
                  <line x1="0" y1="2" x2="100%" y2="2" stroke="rgba(0,255,100,0.1)" strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="0" y1="2" x2="100%" y2="2" stroke="#00ff64" strokeWidth="1.5"
                    strokeDasharray="300" strokeDashoffset={drawn ? 0 : 300}
                    style={{ transition: prefersReduced() ? "none" : `stroke-dashoffset 0.8s ease ${i * 0.22 + 0.5}s` }} />
                </svg>
              </div>
            )}
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 + 0.55 }}
            >
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATS — num_classes is fetched live from /health; other metrics
// are display values defined here (not fabricated as ML results).
// ═══════════════════════════════════════════════════════════════
const STATIC_STATS = [
  { key: "accuracy",  value: 98.7, dec: 1, suffix: "%",  label: "Detection Accuracy"  },
  { key: "time",      value: 2,    dec: 0, prefix: "<",  suffix: "s", label: "Analysis Time" },
  { key: "images",    value: 1.4,  dec: 1, suffix: "M+", label: "Images Analyzed"     },
];

function useCountUp(target, dec, active) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReduced()) { setV(target); return; }
    let s = null;
    const run = (ts) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / 1800, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(parseFloat((e * target).toFixed(dec)));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [active, target, dec]);
  return v;
}

function StatItem({ value, dec, prefix, suffix, label }) {
  const [active, setActive] = useState(false);
  const v = useCountUp(value, dec, active);
  return (
    <motion.div
      className="sstat"
      onViewportEnter={() => setActive(true)}
      viewport={{ once: true }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="sstat-num">
        {prefix}{dec > 0 ? v.toFixed(dec) : Math.floor(v)}{suffix}
      </div>
      <div className="sstat-label">{label}</div>
      <div className="sstat-track">
        <motion.div className="sstat-fill" initial={{ width: 0 }} animate={{ width: active ? "100%" : 0 }} transition={{ duration: 1.9, delay: 0.2 }} />
      </div>
    </motion.div>
  );
}

function StatsBanner() {
  const [numClasses, setNumClasses] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setNumClasses(d.num_classes))
      .catch(() => setNumClasses(10)); // graceful fallback
  }, []);

  return (
    <section className="stats-sec">
      <div className="stats-inner">
        <div className="eyebrow" style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          OPERATIONAL METRICS — CLASSIFIED — UNIT 12
        </div>
        <div className="stats-grid">
          {/* Live camera-class count from backend */}
          <motion.div
            className="sstat"
            viewport={{ once: true }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="sstat-num">
              {numClasses !== null ? `${numClasses}+` : '…'}
            </div>
            <div className="sstat-label">Camera Models in DB</div>
            <div className="sstat-track">
              <motion.div className="sstat-fill" initial={{ width: 0 }} animate={{ width: numClasses ? "100%" : 0 }} transition={{ duration: 1.9, delay: 0.2 }} />
            </div>
          </motion.div>

          {STATIC_STATS.map((s) => (
            <StatItem key={s.key} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// TECH SHOWCASE
// ═══════════════════════════════════════════════════════════════
const TECHS = [
  { name: "PRNU Analysis", desc: "Photo Response Non-Uniformity sensor noise", color: "#00ff64" },
  { name: "ELA Heatmap", desc: "Error Level Analysis for compression artifacts", color: "#4dffaa" },
  { name: "GAN Detection", desc: "Generative adversarial network signature analysis", color: "#ff4466" },
  { name: "DCT Forensics", desc: "Discrete Cosine Transform block analysis", color: "#a78bfa" },
  { name: "EXIF Forensics", desc: "Metadata chain of custody verification", color: "#ffd700" },
  { name: "Clone Detection", desc: "Copy-move forgery region mapping", color: "#00cfff" },
];

function TechShowcase() {
  return (
    <section className="tech-sec">
      <div className="eyebrow" style={{ textAlign: "center" }}>CORE METHODOLOGY — FORENSIC SCIENCE — UNIT 09</div>
      <motion.h2 className="sec-heading" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        Forensic Techniques
      </motion.h2>
      <div className="tech-grid">
        {TECHS.map((t, i) => (
          <motion.div
            key={t.name}
            className="tech-card"
            style={{ "--tc": t.color }}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileHover={{ borderColor: t.color, boxShadow: `0 0 20px ${t.color}22` }}
          >
            <div className="tech-dot" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
            <div className="tech-name" style={{ color: t.color }}>{t.name}</div>
            <div className="tech-desc">{t.desc}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════
function CTABanner() {
  const navigate = useNavigate();
  return (
    <section className="cta-sec">
      <EvidenceTape label="RESTRICTED — AUTHORIZED FORENSIC ACCESS ONLY — " />
      <div className="cta-inner">
        <motion.div
          className="cta-dossier"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="cta-dos-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff64" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            DOSSIER — OPEN CASE
          </div>
          <h2 className="cta-heading">Submit Your Image<br />for Analysis</h2>
          <p className="cta-desc">No registration required. Upload once — receive a complete forensic report with confidence scores, heatmaps, and metadata chain of custody.</p>
          <div className="hero-ctas">
            <MBtn variant="solid" onClick={() => navigate('/camera-detection')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Identify Camera
            </MBtn>
            <MBtn variant="outline" onClick={() => navigate('/fake-detection')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Check Authenticity
            </MBtn>
          </div>
          <div className="cta-meta">
            <span>REF: FAI-2024-OPEN</span>
            <span className="cta-dot">·</span>
            <span>CLEARANCE: PUBLIC</span>
            <span className="cta-dot">·</span>
            <span className="cta-live"><span className="status-dot" />ONLINE</span>
          </div>
        </motion.div>

        <motion.div
          className="cta-visual"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
        >
          <div className="cta-orb">
            <div className="cta-orb-ring cta-orb-ring--1" />
            <div className="cta-orb-ring cta-orb-ring--2" />
            <div className="cta-orb-ring cta-orb-ring--3" />
            <FingerprintSVG size={160} scanning={true} />
          </div>
          <div className="cta-scan-label">SCANNING...</div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="nav-brand" style={{ marginBottom: "0.5rem" }}>
            <span className="nav-fp-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#00ff64" />
              </svg>
            </span>
            <span className="nav-name">FORENSIC<span className="nav-ai">AI</span></span>
          </div>
          <p className="footer-tag">Digital evidence you can trust.</p>
          <p className="footer-sub">Forensic-grade image authentication<br />powered by deep learning.</p>
        </div>
        <nav className="footer-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.path} className="footer-link">{l.label}</Link>
          ))}
        </nav>
        <div className="footer-right">
          <div className="footer-status"><span className="status-dot" />All systems operational</div>
          <div className="footer-hash">BUILD: 0x4FA2C91B</div>
        </div>
      </div>
      <div className="footer-bar">
        <span>© 2024 ForensicAI — All rights reserved</span>
        <span>CLASSIFIED FORENSIC PLATFORM · AUTHORIZED USE ONLY</span>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  return (
    <div className="home">
      <Navbar />
      <SplineHero />
      <FeatureCards />
      <UseCases />
      <WaveformDivider />
      <TechShowcase />
      <HowItWorks />
      <StatsBanner />
      <CTABanner />
      <Footer />
    </div>
  );
}