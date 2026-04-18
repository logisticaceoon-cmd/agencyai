'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { fadeInUp } from '@/lib/animations'

const testimonials = [
  {
    name: 'Mariana López',
    role: 'CEO · Digital Spark Agency',
    avatar: 'ML',
    quote: 'Antes perdíamos 2 horas al día solo buscando información entre Drive, WhatsApp y Excel. Con AgencyAI, todo está en un clic. Nuestros clientes están más contentos y nosotros más organizados.',
    rating: 5,
    metric: 'Ahorramos 10 horas/semana',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Founder · ROI Media',
    avatar: 'CR',
    quote: 'El módulo de finanzas nos abrió los ojos. Descubrimos que 3 clientes que creíamos rentables en realidad nos costaban dinero. AgencyAI nos salvó literalmente.',
    rating: 5,
    metric: '+30% rentabilidad',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Valentina Torres',
    role: 'Traffic Manager · Growth Lab',
    avatar: 'VT',
    quote: 'Los reportes automáticos me cambiaron la vida. Antes tardaba 3 horas por cliente armando el reporte mensual. Ahora lo genero en 5 minutos con datos reales.',
    rating: 5,
    metric: 'De 3 horas a 5 minutos',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Diego Martínez',
    role: 'Director · Ads Factory',
    avatar: 'DM',
    quote: 'Probamos ClickUp, Monday, Notion... ninguno entendía la realidad de una agencia. AgencyAI fue diseñado por gente que entiende nuestro trabajo. Se nota en cada detalle.',
    rating: 5,
    metric: '4 herramientas reemplazadas',
    gradient: 'from-orange-500 to-red-500',
  },
]

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const t = testimonials[current]

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const next = () => setCurrent((c) => (c + 1) % testimonials.length)
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)

  return (
    <section id="testimonios" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[80px]" />
      </div>

      <div className="mx-auto max-w-4xl" ref={ref}>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 text-sm text-purple-400 mb-6 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <Star className="h-4 w-4 fill-purple-400" />
            Lo que dicen nuestros usuarios
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Agencias que ya{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              transformaron
            </span>
            {' '}su operación
          </h2>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="relative"
        >
          <div className="landing-card-glow rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 sm:p-12 backdrop-blur-sm relative overflow-hidden" style={{ '--glow-color': 'rgba(168,85,247,0.12)' } as React.CSSProperties}>
            <Quote className="absolute top-6 right-6 h-16 w-16 text-zinc-800/30" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -40, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
              >
                {/* Rating with glow */}
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
                  ))}
                </div>

                <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed mb-8 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="text-sm text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                    <p className="text-sm font-semibold text-green-400">{t.metric}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation with glow */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current
                      ? 'w-8 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                      : 'w-2 bg-zinc-700 hover:bg-zinc-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
