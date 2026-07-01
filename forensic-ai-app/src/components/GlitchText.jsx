import React, { useState, useEffect } from 'react';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-+=|[]{}<>";

const GlitchText = ({ text, duration = 1200, style, className }) => {
  const [displayText, setDisplayText] = useState('');
  const [isDecoding, setIsDecoding] = useState(true);

  useEffect(() => {
    let start = Date.now();
    let frameId;

    const tick = () => {
      const now = Date.now();
      const progress = Math.min((now - start) / duration, 1);

      if (progress === 1) {
        setDisplayText(text);
        setIsDecoding(false);
        return;
      }

      let scrambled = "";
      for (let i = 0; i < text.length; i++) {
        // Lock in correct characters from left to right as progress increases
        if (i < text.length * progress) {
          scrambled += text[i];
        } else {
          // Preserve spaces for visual structure
          if (text[i] === ' ') {
            scrambled += ' ';
          } else {
            scrambled += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
      }
      setDisplayText(scrambled);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [text, duration]);

  return (
    <span 
      className={className} 
      style={{ 
        ...style, 
        fontFamily: isDecoding ? '"JetBrains Mono", monospace' : style?.fontFamily 
      }}
    >
      {displayText}
    </span>
  );
};

export default GlitchText;
