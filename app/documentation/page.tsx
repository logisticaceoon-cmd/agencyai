'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Book, Code, Zap, HelpCircle, ChevronDown, ChevronRight, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'

const API_BASE = 'https://agencyai-iota.vercel.app/api/cowork'

const MODULES = [
  { name: 'Dashboard', desc: 'Panel ejecutivo con KPIs, tareas pendientes y actividad reciente del equipo.', path: '/dashboard' },
  { name: 'CRM Clientes', desc: 'Gestion completa de clientes con accesos, contratos, status y comisiones.', path: '/clients' },
  { name: 'Proyectos', desc: 'Proyectos por cliente con milestones, estados y asignacion de equipo.', path: '/projects' },
  { name: 'Tareas', desc: 'Sistema de tareas con prioridades, deadlines, subtareas y asignacion multiple.', path: '/tasks' },
  { name: 'Finanzas', desc: 'Transacciones, facturas, comisiones, rentabilidad por cliente y graficos.', path: '/finances' },
  { name: 'Reportes', desc: 'Reportes mensuales y semanales por cliente con metricas de rendimiento.', path: '/reports' },
  { name: 'KPIs', desc: 'Metricas con historial, progreso circular, tendencia y alertas automaticas.', path: '/kpis' },
  { name: 'Objetivos', desc: 'OKRs por trimestre con key results y progreso automatico.', path: '/objectives' },
  { name: 'Minutas', desc: 'Actas de reunion con extraccion automatica de tareas y acuerdos.', path: '/meetings' },
  { name: 'Documentos', desc: 'SOPs, manuales, templates y procesos organizados por categoria.', path: '/documentation' },
  { name: 'Portal Cliente', desc: 'Acceso externo para clientes via token unico, sin necesidad de cuenta.', path: '/portal' },
  { name: 'Notificaciones', desc: 'Centro de notificaciones en tiempo real con filtros y polling automatico.', path: '/notifications' },
]

const ENDPOINTS = [
  { method: 'GET', path: '/health', desc: 'Health check (sin auth)', auth: false },
  { method: 'GET', path: '/tasks', desc: 'Listar tareas con filtros (date, status, client_id, project_id, assigned_to)', auth: true },
  { method: 'POST', path: '/tasks', desc: 'Crear nueva tarea', auth: true },
  { method: 'GET', path: '/tasks/:id', desc: 'Obtener detalle de tarea', auth: true },
  { method: 'PATCH', path: '/tasks/:id', desc: 'Actualizar tarea', auth: true },
  { method: 'POST', path: '/tasks/:id', desc: 'Completar tarea (action: "complete")', auth: true },
  { method: 'GET', path: '/clients', desc: 'Listar clientes activos', auth: true },
  { method: 'GET', path: '/projects', desc: 'Listar proyectos', auth: true },
  { method: 'GET', path: '/team', desc: 'Listar miembros del equipo', auth: true },
]

const FAQ = [
  {
    q: 'Como creo una cuenta?',
    a: 'Ve a la pagina de registro, ingresa tu email y contrasena. Despues del registro se crea tu workspace automaticamente y puedes comenzar el onboarding de 3 pasos.',
  },
  {
    q: 'Puedo invitar a mi equipo?',
    a: 'Si. Ve a Settings → Team y envia invitaciones por email. Cada miembro recibe un link para unirse con el rol asignado (admin, member, viewer).',
  },
  {
    q: 'Que diferencia hay entre planes?',
    a: 'Cada plan tiene limites de usuarios, clientes y modulos. El plan Free permite 1 usuario y 2 clientes. Pro agrega finanzas, KPIs y objetivos. Agency incluye portal de cliente y AI.',
  },
  {
    q: 'Como conecto Cowork?',
    a: 'Ve a Settings → API Keys, genera una key, copiala. En Cowork: Settings → Integrations → AgencyAI, pega la key y el endpoint. Test connection y listo.',
  },
  {
    q: 'Mis datos estan seguros?',
    a: 'Si. Usamos Supabase con Row Level Security (RLS), autenticacion JWT, y aislamiento completo entre workspaces. Ningun workspace puede ver datos de otro.',
  },
  {
    q: 'Puedo exportar mis datos?',
    a: 'Si. El modulo de finanzas permite exportar transacciones en CSV. Los reportes se pueden descargar. La API Cowork permite acceder a todos tus datos programaticamente.',
  },
]

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PATCH: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] || 'bg-slate-100 text-slate-600'}`}>
      {method}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded hover:bg-slate-200 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  )
}

export default function DocsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [openSection, setOpenSection] = useState<string>('quickstart')

  const sections = [
    { id: 'quickstart', label: 'Inicio rapido', icon: Zap },
    { id: 'modules', label: 'Modulos', icon: Book },
    { id: 'api', label: 'API Cowork', icon: Code },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-900 hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold text-lg">AgencyAI</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-slate-500">Documentacion</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar sesion
            </Link>
            <Link href="/register" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setOpenSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    openSection === s.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile section tabs */}
            <div className="md:hidden flex gap-1 mb-6 overflow-x-auto pb-2">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setOpenSection(s.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    openSection === s.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick Start */}
            {openSection === 'quickstart' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Inicio rapido</h1>
                  <p className="mt-2 text-slate-500">Empieza a usar AgencyAI en 5 minutos.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Crea tu cuenta', desc: 'Registrate con tu email. Se crea tu workspace automaticamente.' },
                    { step: 2, title: 'Completa el onboarding', desc: 'Selecciona tu tipo profesional, nombre tu agencia y configura preferencias.' },
                    { step: 3, title: 'Agrega tu primer cliente', desc: 'Ve a Clientes → Nuevo cliente. Ingresa nombre, email y datos del contrato.' },
                    { step: 4, title: 'Crea un proyecto', desc: 'Asocia un proyecto al cliente con tipo de servicio (Meta Ads, Google Ads, Landing, etc.).' },
                    { step: 5, title: 'Asigna tareas', desc: 'Crea tareas dentro del proyecto con prioridad, deadline y asignacion al equipo.' },
                    { step: 6, title: 'Invita a tu equipo', desc: 'Settings → Team → Invitar. Cada miembro recibe email con link de acceso.' },
                  ].map(s => (
                    <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {s.step}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">Conectar Cowork (opcional)</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Si usas Cowork como herramienta de escritorio, podes sincronizar tareas automaticamente.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li>Ve a Settings → API Keys</li>
                    <li>Genera una nueva API key</li>
                    <li>En Cowork: Settings → Integrations → AgencyAI</li>
                    <li>Pega la key y el endpoint</li>
                    <li>Test connection</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Modules */}
            {openSection === 'modules' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Modulos</h1>
                  <p className="mt-2 text-slate-500">Todos los modulos disponibles en AgencyAI.</p>
                </div>

                <div className="grid gap-3">
                  {MODULES.map(m => (
                    <div key={m.name} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Cowork */}
            {openSection === 'api' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">API Cowork</h1>
                  <p className="mt-2 text-slate-500">API REST para integrar herramientas externas con AgencyAI.</p>
                </div>

                {/* Base URL */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Base URL</h3>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <code className="flex-1 text-sm font-mono text-slate-700">{API_BASE}</code>
                    <CopyButton text={API_BASE} />
                  </div>
                </div>

                {/* Auth */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Autenticacion</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Todas las rutas (excepto /health) requieren un API key como Bearer token:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-3">
                    <code className="flex-1 text-sm font-mono text-green-400">
                      Authorization: Bearer sk_agencyai_xxxxx
                    </code>
                    <CopyButton text="Authorization: Bearer sk_agencyai_xxxxx" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Genera tu key en{' '}
                    <Link href="/settings/api-keys" className="text-blue-600 hover:underline">
                      Settings → API Keys
                    </Link>
                  </p>
                </div>

                {/* Endpoints table */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">Endpoints</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {ENDPOINTS.map((ep, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <MethodBadge method={ep.method} />
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono text-slate-700">{ep.path}</code>
                          <p className="text-xs text-slate-400 mt-0.5">{ep.desc}</p>
                        </div>
                        {!ep.auth && (
                          <span className="shrink-0 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">publico</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800">Ejemplo: Crear tarea</h3>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-slate-300">
{`curl -X POST "${API_BASE}/tasks" \\
  -H "Authorization: Bearer sk_agencyai_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Optimizar Meta Ads",
    "description": "Aumentar ROAS en 20%",
    "priority": "high",
    "deadline": "2026-04-20T17:00:00Z"
  }'`}
                    </pre>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Respuesta (201)</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-slate-300">
{`{
  "success": true,
  "data": {
    "task": {
      "id": "uuid-here",
      "title": "Optimizar Meta Ads",
      "status": "pending",
      "priority": "high"
    },
    "message": "Task created successfully from Cowork"
  },
  "timestamp": "2026-04-16T12:00:00.000Z"
}`}
                    </pre>
                  </div>
                </div>

                {/* Error codes */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Codigos de error</h3>
                  <div className="space-y-2">
                    {[
                      { code: '401', desc: 'API key invalida, revocada o faltante' },
                      { code: '400', desc: 'Parametros invalidos (ej: title faltante al crear tarea)' },
                      { code: '404', desc: 'Recurso no encontrado' },
                      { code: '500', desc: 'Error interno del servidor' },
                    ].map(e => (
                      <div key={e.code} className="flex items-center gap-3 text-sm">
                        <code className="shrink-0 font-mono font-bold text-red-600">{e.code}</code>
                        <span className="text-slate-500">{e.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FAQ */}
            {openSection === 'faq' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Preguntas frecuentes</h1>
                  <p className="mt-2 text-slate-500">Respuestas a las preguntas mas comunes.</p>
                </div>

                <div className="space-y-2">
                  {FAQ.map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="text-sm font-medium text-slate-900">{item.q}</span>
                        {openFaq === i
                          ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        }
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4">
                          <p className="text-sm text-slate-500">{item.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
