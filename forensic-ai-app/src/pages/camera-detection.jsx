import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { soundManager } from '../utils/soundEffects';
import GlitchText from '../components/GlitchText';
import FlipImage from '../components/FlipImage';
import '../styles/analysis.css';
import '../styles/home.css';

// ─────────────────────────────────────────────────────────────────
// API base URL — set VITE_API_BASE_URL (or REACT_APP_API_BASE_URL)
// in your .env file. Falls back to empty string (same-origin proxy).
// ─────────────────────────────────────────────────────────────────
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  '/api';

const MAX_FILE_SIZE_MB = 20;

function EvidenceTape({ label }) {
  return (
    <div className="evtape" style={{ position: 'fixed', top: 0, zIndex: 100 }}>
      <div className="evtape__track">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="evtape__text">{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function CameraDetection() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus]   = useState('IDLE'); // IDLE | SCANNING | RESULT | ERROR
  const [result, setResult]   = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileHash, setFileHash] = useState('');
  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  // ── file validation ───────────────────────────────────────────
  const validateAndSetFile = (selected) => {
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPEG, PNG, TIFF, HEIC, etc.).');
      setStatus('ERROR');
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File exceeds ${MAX_FILE_SIZE_MB} MB limit. Please use a smaller image.`);
      setStatus('ERROR');
      return;
    }

    soundManager.playBeep();
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setStatus('IDLE');
    setResult(null);
    setErrorMsg('');
    setFileHash('');

    // Generate Chain of Custody Hash (SHA-256)
    selected.arrayBuffer().then(buffer => {
      crypto.subtle.digest('SHA-256', buffer).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setFileHash(hashHex);
      });
    }).catch(err => console.error("Hashing failed:", err));
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files[0]);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  // ── camera model analysis  → POST /predict ───────────────────
  const analyzeImage = async () => {
    if (!file) return;
    setStatus('SCANNING');
    soundManager.startScanHum();

    // Brief visual pause so the scanning animation is perceptible
    await new Promise((r) => setTimeout(r, 1800));

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          'Backend server is unreachable or returned invalid data. Ensure python app.py is running.'
        );
      }

      if (!response.ok) {
        throw new Error(data.error || 'Server analysis failed.');
      }

      setResult(data);
      setStatus('RESULT');
      soundManager.playImpact(data.is_forgery);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('ERROR');
      soundManager.playImpact(true);
    } finally {
      soundManager.stopScanHum();
    }
  };

  // ── derive authenticity values from /predict response ─────────
  const isForgery     = result?.is_forgery ?? false;
  const rawScore      = result ? parseFloat(result.raw_score ?? 0.5) : 0.5;
  const realPct       = (rawScore * 100).toFixed(1);
  const fakePct       = ((1 - rawScore) * 100).toFixed(1);
  const authAccent    = isForgery ? '#ff4466' : '#00ff64';

  // ── PDF export ────────────────────────────────────────────────
  const exportReport = async () => {
    try {
      if (!result || !file) return;

      const doc = new jsPDF();
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 20);
      doc.text("FORENSIC AI - ANALYSIS REPORT", 105, 20, null, null, "center");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`DATE GENERATED: ${new Date().toLocaleString()}`, 105, 28, null, null, "center");

      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 255, 100);
      doc.line(14, 34, 196, 34);

      // Convert uploaded File to base64 image
      const imgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error("File read error"));
        reader.readAsDataURL(file);
      });

      // Add Image layout while preserving aspect ratio
      const imgProps = doc.getImageProperties(imgData);
      const maxDim = 60;
      let w = imgProps.width;
      let h = imgProps.height;
      if (w > h) {
         h = (h * maxDim) / w;
         w = maxDim;
      } else {
         w = (w * maxDim) / h;
         h = maxDim;
      }
      doc.addImage(imgData, imgProps.fileType, 14, 42, w, h);
      
      // Add Summary Details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text("SCAN SUMMARY", 80, 50);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Analysis Type:  Camera Model Sensor Footprint (PRNU)`, 80, 60);
      doc.text(`Verdict:           ${result.predicted_class}`, 80, 67);
      doc.text(`Confidence:     ${result.confidence}`, 80, 74);
      doc.text(`File Moniker:   ${file.name}`, 80, 81);
      doc.text(`Patches Used:   ${result.patches_processed} extracted`, 80, 88);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`CUSTODY HASH (SHA-256):`, 80, 97);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(fileHash || 'Pending calculation...', 80, 102);
      
      // Add Table for Class Scores
      const tableData = Object.entries(result.class_scores || {})
          .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
          .map(([cls, score]) => [cls, score]);

      autoTable(doc, {
          startY: 115,
          head: [['CAMERA MODEL', 'CONFIDENCE SCORE']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 200, 100], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4 },
          alternateRowStyles: { fillColor: [245, 255, 248] },
      });

      // Add Footer
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 110;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("--- AUTOMATED REPORT END ---", 105, finalY + 20, null, null, "center");

      doc.save(`forensic-camera-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate report:", err);
      alert("Failed to export PDF: " + err.message);
    }
  };

  // ── reset ─────────────────────────────────────────────────────
  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrorMsg('');
    setFileHash('');
    setStatus('IDLE');
  };

  return (
    <div className="analysis-page">
      <EvidenceTape label="DO NOT CROSS — FORENSIC ANALYSIS ZONE — " />

      <button
        onClick={() => navigate('/')}
        className="mbtn mbtn--outline"
        style={{ position: 'absolute', top: '100px', left: '2rem', zIndex: 10 }}
      >
        <span>← RETURN TO HQ</span>
      </button>

      <div className="analysis-container">
        <div className="analysis-header">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="eyebrow" style={{ color: '#00ff64' }}>
              PRNU SENSOR NOISE FINGERPRINTING
            </div>
            <h1 className="analysis-title">Camera Model Detection</h1>
            <p className="upload-subtext">
              Upload a JPEG / PNG to extract hardware sensor noise fingerprints.
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── IDLE / file-selected ── */}
          {status === 'IDLE' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="upload-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />

              {!file ? (
                <>
                  <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div className="upload-text">DRAG & DROP EVIDENCE HERE</div>
                  <div className="upload-subtext">OR CLICK TO BROWSE · MAX {MAX_FILE_SIZE_MB} MB</div>
                </>
              ) : (
                <div style={{ padding: '2rem' }}>
                  <img
                    src={preview}
                    alt="Evidence"
                    style={{ maxWidth: '300px', borderRadius: '8px', border: '1px solid #00ff64' }}
                  />
                  <div className="upload-text" style={{ marginTop: '1rem', color: '#00ff64' }}>
                    EVIDENCE LOGGED: {file.name}
                  </div>
                  
                  {fileHash && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ 
                        marginTop: '0.75rem', padding: '0.75rem', 
                        background: 'rgba(0, 255, 100, 0.05)', 
                        border: '1px solid rgba(0, 255, 100, 0.3)',
                        borderRadius: '6px', display: 'inline-block'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#00ff64', letterSpacing: '2px', marginBottom: '0.25rem' }}>
                        SECURE CHAIN OF CUSTODY HASH (SHA-256)
                      </div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: '#fff' }}>
                        {fileHash}
                      </div>
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); analyzeImage(); }}
                      className="mbtn mbtn--solid"
                    >
                      INITIATE PRNU SCAN
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="mbtn mbtn--outline"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SCANNING ── */}
          {status === 'SCANNING' && preview && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="analysis-state"
            >
              <div className="image-preview-container">
                <img
                  src={preview}
                  alt="Scanning"
                  className="image-preview"
                  style={{ opacity: 0.5, filter: 'grayscale(100%) contrast(1.5)' }}
                />
                <motion.div
                  className="scan-line"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                />
              </div>
              <motion.div
                className="loading-text"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                &gt; DECOMPOSING PIXEL ARRAYS…
              </motion.div>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {status === 'RESULT' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="result-container"
            >
              <div className="result-card">
                <div className="result-header">
                  <div className="result-title">ANALYSIS VERDICT</div>
                  <div
                    className="status-dot"
                    style={{ background: '#00ff64', boxShadow: '0 0 10px #00ff64' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
                  <FlipImage 
                    src={preview} 
                    alt="Processed" 
                    isDanger={result.is_forgery}
                    label="PRNU SENSOR MAP"
                  />
                  <div>
                    <h2 style={{
                      fontSize: '2.5rem', color: '#fff', margin: '0 0 0.5rem 0',
                      fontFamily: '"Big Shoulders Display", sans-serif',
                    }}>
                      <GlitchText text={result.predicted_class} duration={1200} />
                    </h2>
                    <div style={{
                      color: '#00ff64', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.2rem',
                    }}>
                      CONFIDENCE: {result.confidence}
                    </div>
                    <div className="upload-subtext" style={{ marginTop: '0.5rem' }}>
                      Patches processed: {result.patches_processed}
                      {' · '}
                      Fallback: {result.used_fallback ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>

                <div className="eyebrow" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                  ALL CAMERA MODEL SCORES
                </div>
                <div className="graph-container">
                  {Object.entries(result.class_scores || {})
                    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
                    .map(([cls, score], index) => {
                      const perc = parseFloat(score);
                      const isTop = index === 0;
                      return (
                        <div className="bar-wrap" key={cls}>
                          <div className="bar-label">
                            <span style={isTop ? { color: '#00ff64', fontWeight: 'bold' } : undefined}>
                              {isTop ? '★ ' : ''}{cls}
                            </span>
                            <span style={isTop ? { color: '#00ff64' } : undefined}>{score}</span>
                          </div>
                          <div className="bar-bg">
                            <motion.div
                              className="bar-fill"
                              style={isTop ? { background: '#00ff64' } : {}}
                              initial={{ width: 0 }}
                              animate={{ width: `${perc}%` }}
                              transition={{ duration: 1, delay: index * 0.08 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>


              </div>

              <div className="action-buttons">
                <button onClick={reset} className="mbtn mbtn--outline">
                  NEW ANALYSIS
                </button>
                <button onClick={exportReport} className="mbtn mbtn--solid">
                  EXPORT REPORT
                </button>
              </div>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {status === 'ERROR' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="result-container"
            >
              <div className="result-card danger">
                <div className="result-header">
                  <div className="result-title">SCAN FAILED</div>
                </div>
                <div className="error-text">ERR: {errorMsg}</div>
                <div className="action-buttons">
                  <button onClick={reset} className="mbtn mbtn--outline">
                    RETRY
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}