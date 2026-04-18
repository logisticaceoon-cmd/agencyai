'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, Zap, Rocket } from 'lucide-react'
import { fadeInUp, scaleIn, pulseGlow } from '@/lib/animations'

export default function CTASection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-3xl text-center" ref={ref}>
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl shadow-indigo-600/30 mx-auto">
            <Rocket className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6"
        >
          ¿Listo para{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            transformar
          </span>
          {' '}tu agencia?
        </motion.h2>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto"
        >
          Únete a cientos de agencias y freelancers que ya dejaron el caos atrás.
          Tu agencia merece una herramienta que fue hecha para ella.
        </motion.p>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.div {...pulseGlow} className="rounded-2xl">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-5 text-lg font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105"
            >
              <Zap className="h-5 w-5" />
              Empezar Gratis Ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <p className="text-sm text-zinc-500">
            No requiere tarjeta de crédito · Plan Free para siempre
          </p>
          <p className="text-xs text-zinc-600">
            Configuración en 2 minutos · Cancela cuando quieras
          </p>
        </motion.div>
      </div>
    </section>
  )
}
