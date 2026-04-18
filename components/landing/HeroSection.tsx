'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Star, Play } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useCountUp } from '@/hooks/useCountUp'
import { useInView } from 'react-intersection-observer'

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.5 })
  const count = useCountUp(value, 2000, 0, inView)

  return (
    <div ref={ref} className="text-center group cursor-default">
      <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 transition-all group-hover:drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
        {count}{suffix}
      </p>
      <p className="text-xs text-zinc-500 mt-1.5">{label}</p>
    </div>
  )
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const textScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.05])
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Parallax nebula background */}
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }}>
        <motion.div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const }}
        />
        <motion.div
          className="absolute bottom-[20%] left-[15%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' as const }}
        />
        <motion.div
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' as const }}
        />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ scale: textScale, opacity }}
        className="mx-auto max-w-5xl text-center px-4 will-change-transform"
      >
        {/* Badge with shimmer */}
        <motion.div variants={staggerItem} className="mb-8">
          <span className="landing-shimmer inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-sm text-indigo-300 backdrop-blur-sm">
            <Star className="h-4 w-4 fill-indigo-400 text-indigo-400" />
            La plataforma #1 para agencias de marketing digital
          </span>
        </motion.div>

        {/* Headline with glow */}
        <motion.h1
          variants={staggerItem}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-8"
        >
          Deja de perder{' '}
          <span className="relative inline-block">
            <span className="landing-gradient-text text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-[length:200%_auto]">
              dinero y tiempo
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 blur-2xl -z-10" />
            <motion.span
              className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
            />
          </span>
          <br />
          gestionando tu agencia
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={staggerItem}
          className="text-lg sm:text-xl md:text-2xl text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Clientes en WhatsApp, tareas en Trello, finanzas en Excel, reportes en Drive...
          <span className="text-white font-semibold"> ¿Suena familiar?</span>
          <br className="hidden sm:block" />
          AgencyAI centraliza TODO en un solo panel inteligente.
        </motion.p>

        {/* CTAs with glow */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="landing-btn-glow landing-shimmer relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105"
          >
            Comenzar Gratis <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#solucion"
            className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/50 px-8 py-4 text-lg font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-all backdrop-blur-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
          >
            <Play className="h-5 w-5 text-indigo-400" /> Ver cómo funciona
          </a>
        </motion.div>

        {/* Trust line */}
        <motion.div variants={staggerItem} className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-600">
            Sin tarjeta de crédito · Setup en 2 minutos · Plan Free para siempre
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]" />
            ))}
            <span className="text-sm text-zinc-500 ml-2">Usado por +500 agencias</span>
          </div>
        </motion.div>

        {/* Animated counting stats */}
        <motion.div
          variants={staggerItem}
          className="mt-16 grid grid-cols-3 gap-6 max-w-xl mx-auto"
        >
          <AnimatedStat value={500} suffix="+" label="Agencias activas" />
          <AnimatedStat value={50} suffix="K" label="Tareas completadas" />
          <AnimatedStat value={99} suffix=".9%" label="Uptime garantizado" />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const }}
        style={{ opacity }}
      >
        <div className="w-6 h-10 border-2 border-zinc-700 rounded-full flex justify-center pt-2 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
          <motion.div
            className="w-1.5 h-2.5 bg-indigo-500 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </div>
      </motion.div>
    </section>
  )
}
