'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const orbs = [
  { size: 600, x: '20%', y: '15%', color: 'rgba(99, 102, 241, 0.07)', duration: 25 },
  { size: 400, x: '70%', y: '30%', color: 'rgba(139, 92, 246, 0.06)', duration: 30 },
  { size: 350, x: '40%', y: '60%', color: 'rgba(236, 72, 153, 0.05)', duration: 20 },
  { size: 500, x: '80%', y: '70%', color: 'rgba(59, 130, 246, 0.06)', duration: 35 },
  { size: 300, x: '10%', y: '80%', color: 'rgba(168, 85, 247, 0.05)', duration: 22 },
]

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 30
      mouseY = (e.clientY / window.innerHeight - 0.5) * 30
    }

    const animate = () => {
      // Lerp for smooth following
      currentX += (mouseX - currentX) * 0.05
      currentY += (mouseY - currentY) * 0.05
      container.style.transform = `translate(${currentX}px, ${currentY}px)`
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Floating orbs with mouse parallax */}
      <div ref={containerRef} className="absolute inset-[-50px] will-change-transform">
        {orbs.map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
            animate={{
              x: [0, 30, -20, 10, 0],
              y: [0, -25, 15, -10, 0],
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: 'easeInOut' as const,
            }}
          />
        ))}
      </div>

      {/* Top radial gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-[#0a0a0a] via-transparent to-transparent" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
    </div>
  )
}
