import { useRef, useEffect, useCallback } from 'react';

// ──────────────────────────────────────────────────────────────
// Evidence nodes – fixed positions as fractions of canvas W/H
// ──────────────────────────────────────────────────────────────
const NODES = [
  { fx: 0.22, fy: 0.20, type: 'prnu',     label: 'PRNU TRACE',    conf: 98, color: '#00ff64' },
  { fx: 0.68, fy: 0.28, type: 'artifact', label: 'ARTIFACT #A4',  conf: 94, color: '#ff4466' },
  { fx: 0.35, fy: 0.62, type: 'clone',    label: 'CLONE REGION',  conf: 87, color: '#ffaa00' },
  { fx: 0.72, fy: 0.70, type: 'deepfake', label: 'DEEPFAKE SIG',  conf: 99, color: '#ff6600' },
  { fx: 0.55, fy: 0.45, type: 'meta',     label: 'EXIF MISMATCH', conf: 76, color: '#a78bfa' },
  { fx: 0.15, fy: 0.72, type: 'ela',      label: 'ELA SPIKE',     conf: 91, color: '#00cfff' },
  { fx: 0.82, fy: 0.50, type: 'gan',      label: 'GAN ARTIFACT',  conf: 96, color: '#ff4466' },
];

const LENS_R   = 100;  // lens radius px
const ZOOM     = 2.8;  // magnification factor
const STIFF    = 0.13; // spring stiffness
const DAMP     = 0.78; // spring damping

// ── helper: noise texture ──────────────────────────────────────
function makeNoiseImage(W, H) {
  const offscreen = document.createElement('canvas');
  offscreen.width  = W;
  offscreen.height = H;
  const ctx = offscreen.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 18;
    img.data[i]     = v;
    img.data[i + 1] = v + Math.random() * 6;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return offscreen;
}

// ── draw base dark forensic scene ─────────────────────────────
function drawBase(ctx, W, H, noise, t) {
  // Dark background
  ctx.fillStyle = '#020d06';
  ctx.fillRect(0, 0, W, H);

  // Noise overlay
  ctx.globalAlpha = 0.22;
  ctx.drawImage(noise, 0, 0, W, H);
  ctx.globalAlpha = 1;

  // Subtle grid
  ctx.strokeStyle = 'rgba(0,255,100,0.06)';
  ctx.lineWidth = 0.6;
  const CELL = 32;
  for (let x = 0; x <= W; x += CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += CELL) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Coordinate labels
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(0,255,100,0.06)';
  for (let x = CELL; x < W; x += CELL * 3) {
    for (let y = CELL; y < H; y += CELL * 3) {
      ctx.fillText(`${x.toString(16).toUpperCase().padStart(3,'0')}:${y.toString(16).toUpperCase().padStart(3,'0')}`, x + 2, y - 2);
    }
  }

  // Moving scan lines
  const SL_SPEED = 0.4;
  for (let i = 0; i < 3; i++) {
    const sy = ((t * SL_SPEED + i * (H / 3)) % H);
    const grad = ctx.createLinearGradient(0, sy - 15, 0, sy + 15);
    grad.addColorStop(0, 'rgba(0,255,100,0)');
    grad.addColorStop(0.5, 'rgba(0,255,100,0.04)');
    grad.addColorStop(1, 'rgba(0,255,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 15, W, 30);
  }

  // Dim evidence nodes (barely visible outside lens)
  NODES.forEach(({ fx, fy, color }) => {
    const nx = fx * W, ny = fy * H;
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(t * 0.03 + fx * 10) * 0.03;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(nx, ny, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nx - 7, ny); ctx.lineTo(nx + 7, ny);
    ctx.moveTo(nx, ny - 7); ctx.lineTo(nx, ny + 7);
    ctx.stroke();
    ctx.restore();
  });
}

// ── draw enhanced scene inside lens ───────────────────────────
function drawEnhanced(ctx, W, H, noise, t, lx, ly) {
  const R = LENS_R;

  // Save & clip to lens circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(lx, ly, R, 0, Math.PI * 2);
  ctx.clip();

  // Zoom transform – centered on lens position
  ctx.translate(lx, ly);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-lx, -ly);

  // Richer background inside lens
  ctx.fillStyle = '#010a04';
  ctx.fillRect(lx - R * 2, ly - R * 2, R * 4, R * 4);

  // Enhanced noise (brighter)
  ctx.globalAlpha = 0.28;
  ctx.drawImage(noise, 0, 0, W, H);
  ctx.globalAlpha = 1;

  // ELA heat overlay – coloured blobs at evidence positions
  NODES.forEach(({ fx, fy, color }) => {
    const nx = fx * W, ny = fy * H;
    const d = Math.hypot(nx - lx, ny - ly);
    if (d > R * 1.5) return;
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 18);
    grad.addColorStop(0, color.replace('#', 'rgba(').replace(/(.{2})(.{2})(.{2})/, (_, r, g, b) =>
      `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`) + ',0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(nx, ny, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dense grid inside lens
  ctx.strokeStyle = 'rgba(0,255,100,0.10)';
  ctx.lineWidth = 0.5;
  const CELL = 16;
  for (let x = 0; x <= W; x += CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += CELL) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Vivid evidence nodes
  NODES.forEach(({ fx, fy, color, label, conf }) => {
    const nx = fx * W, ny = fy * H;
    const pulse = 0.7 + Math.sin(t * 0.08 + fx * 12) * 0.3;

    // Outer glow ring
    const grad = ctx.createRadialGradient(nx, ny, 4, nx, ny, 18);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(nx, ny, 18, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * pulse;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(nx - 8, ny); ctx.lineTo(nx + 8, ny);
    ctx.moveTo(nx, ny - 8); ctx.lineTo(nx, ny + 8);
    ctx.stroke();

    // Corner brackets
    const b = 5;
    ctx.lineWidth = 1.2;
    [[nx-10,ny-10,1,1],[nx+10,ny-10,-1,1],[nx-10,ny+10,1,-1],[nx+10,ny+10,-1,-1]].forEach(([bx,by,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(bx, by + sy * b); ctx.lineTo(bx, by); ctx.lineTo(bx + sx * b, by);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Label
    ctx.font = `bold ${7 / ZOOM + 4}px "JetBrains Mono", monospace`;
    ctx.fillStyle = color;
    ctx.globalAlpha = pulse;
    ctx.fillText(label, nx + 14, ny - 5);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${6 / ZOOM + 3}px "JetBrains Mono", monospace`;
    ctx.fillText(`CONF: ${conf}%`, nx + 14, ny + 7);
    ctx.globalAlpha = 1;
  });

  ctx.restore(); // end zoom transform + clip

  // Post-clip: scan line inside lens (no zoom)
  ctx.save();
  ctx.beginPath();
  ctx.arc(lx, ly, R, 0, Math.PI * 2);
  ctx.clip();
  const scanY = ly - R + ((t * 1.4) % (R * 2));
  const scanGrad = ctx.createLinearGradient(lx - R, scanY - 6, lx - R, scanY + 6);
  scanGrad.addColorStop(0, 'rgba(0,255,100,0)');
  scanGrad.addColorStop(0.5, 'rgba(0,255,100,0.25)');
  scanGrad.addColorStop(1, 'rgba(0,255,100,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(lx - R, scanY - 6, R * 2, 12);
  ctx.restore();
}

// ── draw the glass frame ───────────────────────────────────────
function drawLensFrame(ctx, lx, ly, t) {
  const R = LENS_R;

  // Outer glow
  const glow = ctx.createRadialGradient(lx, ly, R - 4, lx, ly, R + 26);
  glow.addColorStop(0, 'rgba(0,255,100,0.45)');
  glow.addColorStop(1, 'rgba(0,255,100,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lx, ly, R + 26, 0, Math.PI * 2);
  ctx.fill();

  // Main ring
  ctx.strokeStyle = '#00ff64';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#00ff64';
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(lx, ly, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner ring
  ctx.strokeStyle = 'rgba(0,255,100,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(lx, ly, R - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Tick marks (12 ticks)
  ctx.strokeStyle = '#00ff64';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const len = i % 3 === 0 ? 8 : 4;
    const x1 = lx + Math.cos(angle) * R;
    const y1 = ly + Math.sin(angle) * R;
    const x2 = lx + Math.cos(angle) * (R - len);
    const y2 = ly + Math.sin(angle) * (R - len);
    ctx.globalAlpha = i % 3 === 0 ? 0.9 : 0.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rotating crosshair marks at 90°
  const spin = t * 0.015;
  ['#00ff64', 'rgba(0,255,100,0.3)'].forEach((c, ci) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = ci === 0 ? 1.5 : 0.8;
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2;
      const x1 = lx + Math.cos(a) * (R * 0.12);
      const y1 = ly + Math.sin(a) * (R * 0.12);
      const x2 = lx + Math.cos(a) * (R * 0.38);
      const y2 = ly + Math.sin(a) * (R * 0.38);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  });

  // Handle
  const HANDLE_LEN = 72;
  const HANDLE_W   = 14;
  const ha = Math.PI * 0.78;
  const hx1 = lx + Math.cos(ha) * R;
  const hy1 = ly + Math.sin(ha) * R;
  const hx2 = hx1 + Math.cos(ha) * HANDLE_LEN;
  const hy2 = hy1 + Math.sin(ha) * HANDLE_LEN;

  // Handle shaft gradient
  const hGrad = ctx.createLinearGradient(hx1, hy1, hx2, hy2);
  hGrad.addColorStop(0, '#00ff64');
  hGrad.addColorStop(1, 'rgba(0,200,80,0.6)');
  ctx.strokeStyle = hGrad;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#00ff64';
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(hx1, hy1); ctx.lineTo(hx2, hy2); ctx.stroke();
  ctx.shadowBlur = 0;

  // Handle grip lines
  ctx.strokeStyle = 'rgba(0,20,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'square';
  const perp = ha + Math.PI / 2;
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const t2 = i / (steps + 1);
    const mx = hx1 + (hx2 - hx1) * t2;
    const my = hy1 + (hy2 - hy1) * t2;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(perp) * (HANDLE_W * 0.3), my + Math.sin(perp) * (HANDLE_W * 0.3));
    ctx.lineTo(mx - Math.cos(perp) * (HANDLE_W * 0.3), my - Math.sin(perp) * (HANDLE_W * 0.3));
    ctx.stroke();
  }
  ctx.lineCap = 'round';

  // ZOOM label
  const pulse = 0.75 + Math.sin(t * 0.06) * 0.25;
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgba(0,255,100,${pulse})`;
  ctx.textAlign = 'center';
  ctx.fillText(`${ZOOM}× MAGNIFICATION`, lx, ly - R - 10);

  // HUD readouts around frame
  ctx.font = '7px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(0,255,100,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(`X:${lx.toFixed(0).padStart(4,'0')}`, lx + R + 6, ly - 6);
  ctx.fillText(`Y:${ly.toFixed(0).padStart(4,'0')}`, lx + R + 6, ly + 6);
  ctx.textAlign = 'right';
  ctx.fillText('SCANNING', lx - R - 4, ly);
  ctx.textAlign = 'center';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function ForensicLens() {
  const canvasRef   = useRef(null);
  const mouseRef    = useRef({ x: -999, y: -999 }); // raw mouse (from event)
  const lensRef     = useRef({ x: 300, y: 250, vx: 0, vy: 0 }); // spring state
  const noiseRef    = useRef(null);
  const rafRef      = useRef(null);
  const tRef        = useRef(0);

  // Stable mouse-move handler
  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W;
      canvas.height = H;
      noiseRef.current = makeNoiseImage(W, H);
      // Start lens at center
      lensRef.current = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
      mouseRef.current = { x: W / 2, y: H / 2 };
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    canvas.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      if (!noiseRef.current) { rafRef.current = requestAnimationFrame(tick); return; }
      tRef.current += 1;
      const t  = tRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const lens = lensRef.current;

      // Spring toward mouse
      const fx = (mx - lens.x) * STIFF;
      const fy = (my - lens.y) * STIFF;
      lens.vx  = (lens.vx + fx) * DAMP;
      lens.vy  = (lens.vy + fy) * DAMP;
      lens.x  += lens.vx;
      lens.y  += lens.vy;

      // Clamp inside canvas with margin
      const M = LENS_R + 10;
      lens.x = Math.max(M, Math.min(W - M, lens.x));
      lens.y = Math.max(M, Math.min(H - M, lens.y));

      ctx.clearRect(0, 0, W, H);
      drawBase(ctx, W, H, noiseRef.current, t);
      drawEnhanced(ctx, W, H, noiseRef.current, t, lens.x, lens.y);
      drawLensFrame(ctx, lens.x, lens.y, t);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [onMouseMove]);

  return (
    <div className="fl-root">
      <canvas ref={canvasRef} className="fl-canvas" />
      {/* Bottom label */}
      <div className="fl-label">
        MOVE CURSOR TO INVESTIGATE EVIDENCE
      </div>
    </div>
  );
}
