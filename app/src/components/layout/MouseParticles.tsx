"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    life: number;
    opacity: number;
}

export default function MouseParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const particlesRef = useRef<Particle[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };

            // Add particles on move
            for (let i = 0; i < 2; i++) {
                particlesRef.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    size: Math.random() * 3 + 2,
                    speedX: (Math.random() - 0.5) * 2,
                    speedY: (Math.random() - 0.5) * 2,
                    life: 1.0,
                    opacity: Math.random() * 0.5 + 0.3
                });
            }
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);
        handleResize();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particlesRef.current.length; i++) {
                const p = particlesRef.current[i];
                p.x += p.speedX;
                p.y += p.speedY;
                p.life -= 0.01;

                if (p.life <= 0) {
                    particlesRef.current.splice(i, 1);
                    i--;
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = p.life * p.opacity;
                ctx.fillStyle = "#9945FF"; // Solana Purple

                // Draw a small stylized Solana coin (3 lines)
                const s = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x - s, p.y - s / 2);
                ctx.lineTo(p.x + s, p.y - s / 2);
                ctx.moveTo(p.x - s, p.y);
                ctx.lineTo(p.x + s, p.y);
                ctx.moveTo(p.x - s, p.y + s / 2);
                ctx.lineTo(p.x + s, p.y + s / 2);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "#9945FF";
                ctx.stroke();
                ctx.restore();
            }

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-40"
            style={{ mixBlendMode: 'screen' }}
        />
    );
}
