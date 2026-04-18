'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Play } from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, pulseGlow } from '@/lib/animations'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-pink-600/5 rounded-full blur-[80px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-5xl text-center px-4"
      >
        {/* Badge */}
        <motion.div variants={staggerItem} className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-sm text-indigo-300 backdrop-blur-sm">
            <Star className="h-4 w-4 fill-indigo-400 text-indigo-400" />
            La plataforma #1 para agencias de marketing digital
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={staggerItem}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-8"
        >
          Deja de perder{' '}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              dinero y tiempo
            </span>
            <motion.span
              className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
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

        {/* CTAs */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.div {...pulseGlow} className="rounded-2xl">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105"
            >
              Comenzar Gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
          <a
            href="#solucion"
            className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/50 px-8 py-4 text-lg font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-all backdrop-blur-sm"
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
              <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            ))}
            <span className="text-sm text-zinc-500 ml-2">Usado por +200 agencias</span>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          variants={staggerItem}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {[
            { value: '10x', label: 'Más organizado' },
            { value: '5h', label: 'Ahorradas al día' },
            { value: '30%', label: 'Más rentabilidad' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 border-2 border-zinc-700 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-zinc-500 rounded-full" />
        </div>
      </motion.div>
    </section>
  )
}
