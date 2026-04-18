'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Zap } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'

export default function PricingSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="pricing" className="py-24 px-4 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        <div className="absolute inset-0 bg-zinc-900/30" />
        {/* Subtle glow behind pricing */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl" ref={ref}>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm text-indigo-400 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Zap className="h-4 w-4" />
            Precios transparentes
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Planes que crecen{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              contigo
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Sin sorpresas. Sin contratos. Cambiá de plan cuando quieras.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={staggerItem}
              whileHover={{ y: -10, scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`relative rounded-2xl border p-6 text-left transition-all backdrop-blur-sm ${
                plan.highlighted
                  ? 'landing-card-glow-intense border-indigo-500/50 bg-gradient-to-b from-indigo-600/10 to-purple-600/5'
                  : 'landing-card-glow border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              }`}
              style={{ '--glow-color': plan.highlighted ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)' } as React.CSSProperties}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1 text-xs font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                  Más popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300' : 'text-white'}`}>
                  {plan.price === 0 ? '$0' : `$${plan.price}`}
                </span>
                {plan.price > 0 && <span className="text-sm text-zinc-500 ml-1">/mes</span>}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                    <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-indigo-400 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)]' : 'text-green-400'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`landing-shimmer block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'landing-btn-glow bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
                    : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                }`}
              >
                {plan.price === 0 ? 'Empezar gratis' : 'Comenzar'}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center text-sm text-zinc-600 mt-8"
        >
          Todos los planes incluyen soporte por email · Cancela cuando quieras
        </motion.p>
      </div>
    </section>
  )
}
