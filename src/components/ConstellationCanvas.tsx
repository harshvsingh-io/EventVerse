"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

export default function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Generate 60 nodes (constellation stars)
    const nodes: Node[] = [];
    const nodeCount = Math.min(65, Math.floor((width * height) / 22000));
    
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      nodes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.8,
        baseX: x,
        baseY: y
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const mouse = mouseRef.current;
      const connectionDist = 120;
      const mouseInfluenceDist = 150;

      // 1. Draw connection lines
      ctx.lineWidth = 0.55;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.16;
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // 2. Draw nodes and update positions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Move nodes slowly
        node.x += node.vx;
        node.y += node.vy;

        // Bounce on edges
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Mouse Parallax Attraction
        if (mouse.active) {
          const mdx = mouse.x - node.x;
          const mdy = mouse.y - node.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          
          if (mdist < mouseInfluenceDist) {
            const force = (1 - mdist / mouseInfluenceDist) * 12;
            node.x -= (mdx / mdist) * force * 0.08;
            node.y -= (mdy / mdist) * force * 0.08;
          }
        }

        // Draw star particle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // Differentiate glow based on size
        if (node.radius > 1.8) {
          ctx.fillStyle = "rgba(168, 85, 247, 0.65)"; // violet accent
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
