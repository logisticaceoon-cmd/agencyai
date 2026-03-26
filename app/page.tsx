import Link from 'next/link'
import {
  Zap, CheckSquare, Users, BarChart2, FileText, DollarSign,
  Globe, Brain, Calendar, ArrowRight, Check, Star,
  Target, Shield, Briefcase, TrendingUp, MessageSquare, BookOpen
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

export const metadata = {
  title: 'AgencyAI — El sistema operativo para agencias de marketing digital',
  description:
    'Gestiona clientes, tareas, reportes, finanzas y tu equipo en un solo lugar. Diseñado específicamente para agencias, traffickers y freelancers de marketing digital.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* NAV */}
      <nav className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AgencyAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
            <a href="#for-who" className="hover:text-white transition-colors">¿Para quién?</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 mb-6">
            <Star className="h-3.5 w-3.5" />
            Diseñado para marketing digital
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            El sistema operativo{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              todo-en-uno
            </span>{' '}
            para agencias de marketing
          </h1>

          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Centraliza clientes, tareas, reportes, finanzas, métricas y tu equipo en un solo lugar.
            Deja de trabajar con Drive, WhatsApp, Trello, Excel y PDFs dispersos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
            >
              Crear cuenta gratis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-7 py-3.5 text-base font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Ver demo
            </Link>
          </div>

          <p className="mt-4 text-sm text-zinc-600">Sin tarjeta de crédito · Plan Free para siempre</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-16 px-4 border-y border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">¿Tu agencia trabaja así?</h2>
          <p className="text-zinc-400 mb-10 max-w-xl mx-auto">
            La mayoría de las agencias están fragmentadas entre decenas de herramientas. Eso se termina.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { tool: 'Drive', pain: 'Documentos perdidos' },
              { tool: 'WhatsApp', pain: 'Tareas sin seguimiento' },
              { tool: 'Excel', pain: 'Finanzas manuales' },
              { tool: 'Trello/ClickUp', pain: 'No es para agencias' },
            ].map(({ tool, pain }) => (
              <div key={tool} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-lg font-bold text-zinc-400 mb-1">{tool}</p>
                <p className="text-sm text-zinc-600">{pain}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex-1 max-w-[200px] h-px bg-zinc-800" />
            <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300 font-medium">
              AgencyAI reemplaza todo esto
            </div>
            <div className="flex-1 max-w-[200px] h-px bg-zinc-800" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Todo lo que tu agencia necesita</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Módulos especializados para marketing digital, no adaptaciones de herramientas genéricas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Users,
                title: 'CRM de Clientes',
                description: 'Fee mensual, comisiones, accesos a cuentas publicitarias, estado de pago y portal cliente incluido.',
                color: 'text-blue-400', bg: 'bg-blue-500/10',
              },
              {
                icon: CheckSquare,
                title: 'Tareas y Proyectos',
                description: 'Asigna tareas por cliente, tipo (Meta Ads, Google Ads, Landing), prioridad y seguimiento de avance.',
                color: 'text-green-400', bg: 'bg-green-500/10',
              },
              {
                icon: FileText,
                title: 'Reportes Mensuales',
                description: 'Inversión, ventas, ROAS, comparativa vs mes anterior. Exporta PDF y marca como enviado al cliente.',
                color: 'text-indigo-400', bg: 'bg-indigo-500/10',
              },
              {
                icon: DollarSign,
                title: 'Finanzas de la Agencia',
                description: 'Fees, comisiones, gastos, sueldos, utilidad y proyección mensual. Todo en un solo panel.',
                color: 'text-yellow-400', bg: 'bg-yellow-500/10',
              },
              {
                icon: BarChart2,
                title: 'KPIs y Métricas',
                description: 'ROAS, CPA, inversión, ventas y crecimiento por cliente. Dashboard de equipo y organización.',
                color: 'text-purple-400', bg: 'bg-purple-500/10',
              },
              {
                icon: MessageSquare,
                title: 'Minutas de Reuniones',
                description: 'Registra reuniones, decisiones y acuerdos. Las tareas del acta se crean automáticamente.',
                color: 'text-pink-400', bg: 'bg-pink-500/10',
              },
              {
                icon: Globe,
                title: 'Portal Cliente',
                description: 'Cada cliente tiene su portal privado para ver métricas, reportes, minutas y documentos.',
                color: 'text-teal-400', bg: 'bg-teal-500/10',
              },
              {
                icon: BookOpen,
                title: 'Documentos y SOPs',
                description: 'SOPs, contratos, briefs, manuales. Todo organizado y accesible para todo el equipo.',
                color: 'text-orange-400', bg: 'bg-orange-500/10',
              },
              {
                icon: Brain,
                title: 'Alertas IA',
                description: 'Detecta clientes con ROAS bajo, tareas atrasadas, reportes pendientes y oportunidades de escalar.',
                color: 'text-red-400', bg: 'bg-red-500/10',
              },
            ].map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 transition-colors">
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VS COMPETITION */}
      <section className="py-16 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Por qué no ClickUp o Trello?</h2>
          <p className="text-zinc-400 mb-10 max-w-xl mx-auto">
            Las herramientas genéricas requieren semanas de configuración y aún así no tienen lo que necesita una agencia de marketing.
          </p>
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-left">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">ClickUp / Trello</h3>
              <ul className="space-y-2">
                {[
                  'Genérico para cualquier industria',
                  'Sin módulo de clientes/CRM',
                  'Sin reportes de ROAS/CPA',
                  'Sin finanzas de agencia',
                  'Sin portal para clientes',
                  'Requiere personalización',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/5 p-5 text-left">
              <h3 className="text-sm font-semibold text-indigo-400 mb-4 uppercase tracking-wider">AgencyAI</h3>
              <ul className="space-y-2">
                {[
                  'Diseñado para marketing digital',
                  'CRM con accesos y comisiones',
                  'Reportes mensuales de métricas',
                  'Finanzas y utilidad de agencia',
                  'Portal cliente integrado',
                  'Listo para usar en minutos',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section id="for-who" className="py-20 px-4">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Para quién es AgencyAI?</h2>
          <p className="text-zinc-400 mb-12">Construido para los profesionales del marketing digital</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: Briefcase, title: 'Agencias digitales', desc: 'Gestiona todo tu equipo y cartera de clientes' },
              { icon: Target, title: 'Traffickers', desc: 'Organiza campañas, métricas y clientes' },
              { icon: Globe, title: 'Freelancers', desc: 'Profesionaliza tu operación como solista' },
              { icon: TrendingUp, title: 'Diseñadores', desc: 'Gestiona proyectos y entregas por cliente' },
              { icon: Shield, title: 'Editores de video', desc: 'Tareas, briefings y aprobaciones en orden' },
              { icon: Users, title: 'Equipos de marketing', desc: 'Un sistema para todo el equipo interno' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left hover:border-zinc-600 transition-colors">
                <Icon className="h-5 w-5 text-indigo-400 mb-3" />
                <p className="font-medium text-white text-sm mb-1">{title}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Precios simples y predecibles</h2>
          <p className="text-zinc-400 mb-12">Sin sorpresas. Cambiá de plan cuando quieras.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-5 text-left transition-all ${
                  plan.highlighted
                    ? 'border-indigo-500 bg-indigo-600/5 shadow-lg shadow-indigo-600/10'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    Más popular
                  </div>
                )}
                <div className="mb-3">
                  <h3 className="font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{plan.description}</p>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">
                    {plan.price === 0 ? '$0' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-zinc-500">/mes</span>}
                </div>
                <ul className="space-y-1.5 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {plan.price === 0 ? 'Empezar gratis' : 'Comenzar'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="mx-auto max-w-xl">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-6">
            <Zap className="h-7 w-7 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Tu agencia merece una herramienta de agencia
          </h2>
          <p className="text-zinc-400 mb-8">
            Únete a cientos de agencias y freelancers que ya centralizaron su operación en AgencyAI.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Crear cuenta gratis <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-sm text-zinc-600">Sin tarjeta de crédito · Configuración en 2 minutos</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">AgencyAI</span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} AgencyAI. Sistema operativo para agencias de marketing digital.
          </p>
          <div className="flex gap-4 text-xs text-zinc-600">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
