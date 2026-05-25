import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../../lib/audio-engine';

export default function FFTVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const data = audioEngine.getAnalyzerData();
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      
      const barWidth = (width / data.length) * 2.5;
      let x = 0;

      for(let i = 0; i < data.length; i++) {
        const barHeight = (data[i] / 255) * height;
        
        ctx.fillStyle = `rgb(${data[i] + 100}, 165, 0)`; // Orange-ish
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={32} 
      className="bg-black/40 rounded border border-white/5 shadow-inner"
    />
  );
}
