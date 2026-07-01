import React, { useState } from 'react';

const FlipImage = ({ src, alt, width = '150px', height = '150px', isDanger = false, label = "THERMAL ELA VIEW" }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const mainColor = isDanger ? '#ff4466' : '#00ff64';

  return (
    <div 
      style={{ perspective: '1000px', width, height, flex: '0 0 auto', cursor: 'pointer' }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
        {/* FRONT */}
        <img
          src={src}
          alt={alt}
          style={{
            position: 'absolute',
            width: '100%', height: '100%', objectFit: 'cover',
            borderRadius: '8px', 
            border: `1px solid rgba(${isDanger ? '255,68,102' : '0,255,100'}, 0.5)`,
            backfaceVisibility: 'hidden',
          }}
        />

        {/* BACK (THERMAL MAP) */}
        <div style={{
            position: 'absolute',
            width: '100%', height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${mainColor}`,
            boxShadow: `0 0 20px ${mainColor}40 inset` // 40 is alpha in hex
        }}>
          <img
            src={src}
            alt="Thermal Map"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              // High contrast invert creates a cool thermal/ELA effect
              filter: 'saturate(300%) contrast(400%) invert(80%) hue-rotate(180deg)',
            }}
          />
          <div style={{
            position: 'absolute', bottom: '0', left: '0', width: '100%',
            textAlign: 'center', fontSize: '0.65rem', color: '#fff',
            fontFamily: '"JetBrains Mono", monospace',
            background: 'rgba(0,0,0,0.8)', padding: '4px 0',
            borderTop: `1px solid ${mainColor}`
          }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipImage;
