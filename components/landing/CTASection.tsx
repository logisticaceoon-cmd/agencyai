'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, Zap, Rocket } from 'lucide-react'
import { fadeInUp, scaleIn } from '@/lib/animations'

export default function CTASection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[180px]"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const }}
        />
      </div>

      <div className="mx-auto max-w-3xl text-center" ref={ref}>
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-8"
        >
          <motion.div
            className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 mx-auto"
            animate={{ boxShadow: ['0 0 30px rgba(99,102,241,0.3)', '0 0 60px rgba(99,102,241,0.5)', '0 0 30px rgba(99,102,241,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
          >
            <Rocket className="h-10 w-10 text-white" />
          </motion.div>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6"
        >
          ¿Listo para{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_25px_rgba(139,92,246,0.3)]">
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
          <Link
            href="/register"
            className="landing-btn-glow landing-shimmer flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-5 text-lg font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105"
          >
            <Zap className="h-5 w-5" />
            Empezar Gratis Ahora
            <ArrowRight className="h-5 w-5" />
          </Link>
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
