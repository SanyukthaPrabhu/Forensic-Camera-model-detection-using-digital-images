import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DeepNeuralGridScan = ({ src, durationMs = 3000, mainColor = '#00ff64' }) => {
  const [activeCell, setActiveCell] = useState(null);
  const [hexData, setHexData] = useState('');
  const [progress, setProgress] = useState(0);

  const cells = Array.from({ length: 9 }).map((_, i) => i);

  useEffect(() => {
    let interval;
    const generateHex = () => {
      // Generate some intense looking matrix data
      return 'TNS:' + Math.floor(Math.random() * 8999 + 1000) + ' 0x' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
    };

    let elapsed = 0;
    const tickRate = 120; // fast flash

    interval = setInterval(() => {
      elapsed += tickRate;
      setProgress((elapsed / durationMs) * 100);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        // lock all
        setActiveCell('all');
        return;
      }
      
      // Randomly jump around cells, sometimes picking 2 or 3 (simulate complex processing)
      setActiveCell(Math.floor(Math.random() * 9));
      setHexData(generateHex());
      
    }, tickRate);

    return () => clearInterval(interval);
  }, [durationMs]);

  return (
    <div style={{
      position: 'relative', width: '240px', height: '240px',
      margin: '0 auto', overflow: 'hidden', borderRadius: '4px',
      border: `2px solid ${mainColor}40`,
      background: '#000'
    }}>
      {/* Background Dim Image */}
      <img
        src={src}
        alt="Scanning Base"
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: 0.15, filter: 'grayscale(100%)'
        }}
      />
      
      {/* 3x3 Grid Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
      }}>
        {cells.map((i) => {
          const isActive = activeCell === 'all' || activeCell === i;
          
          return (
            <div key={i} style={{
              position: 'relative', border: `1px solid ${mainColor}20`,
              overflow: 'hidden'
            }}>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.1 }}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                >
                  {/* Exactly align the background size to 240px and offset by cell position to show the "cut out" piece */}
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: `url(${src})`, 
                    backgroundSize: '240px 240px',
                    // cell width is 80px
                    backgroundPosition: `-${(i % 3) * 80}px -${Math.floor(i / 3) * 80}px`,
                    filter: `contrast(1.5) brightness(1.2)`,
                  }} />
                  {/* Neon Hue Overlay */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: `${mainColor}40`, mixBlendMode: 'color'
                  }} />
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    boxShadow: `inset 0 0 10px ${mainColor}`
                  }} />
                  {/* Terminal Text Data */}
                  <div style={{
                    position: 'absolute', bottom: '2px', left: '2px',
                    color: '#fff', fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.45rem', textShadow: `0 0 4px ${mainColor}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {hexData}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        color: '#fff', fontFamily: '"Big Shoulders Display", sans-serif',
        fontSize: '2rem', letterSpacing: '4px', textShadow: `0 0 10px ${mainColor}, 0 0 20px ${mainColor}`,
        opacity: activeCell === 'all' ? 0.8 : 0.3
      }}>
        {Math.min(100, Math.floor(progress))}%
      </div>

    </div>
  );
};

export default DeepNeuralGridScan;
