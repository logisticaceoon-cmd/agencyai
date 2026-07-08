'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart2, Plus, X, TrendingUp, TrendingDown, AlertTriangle,
  Loader2, BookOpen, Search, ArrowRight, ArrowLeft, Check,
  Target, Clock, Calculator, Lightbulb, ChevronRight,
  Users, DollarSign, Briefcase, Brain, Share2, FolderKanban,
  Pencil, Trash2, Download
} from 'lucide-react'
import { downloadCSV } from '@/lib/export'
import { downloadPDF } from '@/lib/pdf'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
import { useTranslation } from '@/lib/i18n'
import { AgentWidget } from '@/components/ai/AgentWidget'
import { InfoBanner } from '@/components/shared/InfoBanner'
import * as Dialog from '@radix-ui/react-dialog'

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
interface KPIRecord { id: string; value: number; period_start: string; period_end: string; notes: string; recorded_at: string }
interface KPI {
  id: string; name: string; description: string; unit: string; target_value: number
  current_value: number; frequency: string; category: string; color: string
  client_id: string; clients: { id: string; name: string } | null
  kpi_records: KPIRecord[]
}
interface Client { id: string; name: string }

/* ────────────────────────────────────────────
   KPI Library Data (40 KPIs)
   ──────────────────────────────────────────── */
type LibraryCategory = 'redes_sociales' | 'financiero' | 'clientes' | 'proyectos_equipo' | 'ia_automatizacion'

interface LibraryKPI {
  id: number
  name: string
  description: string
  unit: string
  category: LibraryCategory
  formula: string
  example: string
  benefit: string
  suggested_target: string
  frequency: string
}

const LIBRARY_CATEGORIES: { value: LibraryCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todos', icon: <BarChart2 size={16} strokeWidth={1.5} /> },
  { value: 'redes_sociales', label: 'Redes Sociales', icon: <Share2 size={16} strokeWidth={1.5} /> },
  { value: 'financiero', label: 'Financiero', icon: <DollarSign size={16} strokeWidth={1.5} /> },
  { value: 'clientes', label: 'Clientes', icon: <Users size={16} strokeWidth={1.5} /> },
  { value: 'proyectos_equipo', label: 'Proyectos y Equipo', icon: <FolderKanban size={16} strokeWidth={1.5} /> },
  { value: 'ia_automatizacion', label: 'IA y Automatizacion', icon: <Brain size={16} strokeWidth={1.5} /> },
]

const KPI_LIBRARY: LibraryKPI[] = [
  // REDES SOCIALES (10)
  { id: 1, name: 'Alcance organico', description: 'Personas unicas que vieron tu contenido sin pauta', unit: 'personas', category: 'redes_sociales', formula: 'Suma de usuarios unicos alcanzados en el periodo', example: 'Si 8,000 personas unicas vieron tus posts en el mes, tu alcance organico es 8,000', benefit: 'Permite medir la visibilidad real de tu contenido sin inversion publicitaria', suggested_target: '10,000 personas/mes', frequency: 'Semanal' },
  { id: 2, name: 'Tasa de engagement', description: '((Likes+Comentarios+Compartidos)/Alcance)x100', unit: '%', category: 'redes_sociales', formula: '((Likes + Comentarios + Compartidos) / Alcance) x 100', example: 'Si tuviste 500 interacciones y 10,000 de alcance: (500/10,000) x 100 = 5%', benefit: 'Indica que tan relevante es tu contenido para la audiencia', suggested_target: '3-6%', frequency: 'Semanal' },
  { id: 3, name: 'Nuevos seguidores', description: 'Crecimiento neto de la comunidad en el periodo', unit: 'seguidores', category: 'redes_sociales', formula: 'Seguidores nuevos - Seguidores perdidos', example: 'Si ganaste 600 y perdiste 100: crecimiento neto = 500', benefit: 'Mide el crecimiento de tu comunidad y el atractivo de tu marca', suggested_target: '500 seguidores/mes', frequency: 'Semanal' },
  { id: 4, name: 'Reproducciones de video', description: 'Total de views en Reels, TikTok o YouTube', unit: 'views', category: 'redes_sociales', formula: 'Suma de reproducciones de todos los videos en el periodo', example: 'Si publicaste 10 Reels y suman 50,000 views en total', benefit: 'Mide el alcance de tu contenido audiovisual y potencial viral', suggested_target: '50,000 views/mes', frequency: 'Semanal' },
  { id: 5, name: 'Tasa de retencion de video', description: '% de personas que ven mas del 50% del video', unit: '%', category: 'redes_sociales', formula: '(Usuarios que vieron >50% / Total de reproducciones) x 100', example: 'Si 3,000 de 10,000 viewers vieron mas de la mitad: 30%', benefit: 'Indica la calidad y relevancia de tu contenido audiovisual', suggested_target: '25-40%', frequency: 'Quincenal' },
  { id: 6, name: 'Impresiones totales', description: 'Veces que el contenido fue mostrado (con repeticiones)', unit: 'impresiones', category: 'redes_sociales', formula: 'Suma de todas las veces que se mostro tu contenido', example: 'Un post visto 3 veces por 1,000 personas = 3,000 impresiones', benefit: 'Mide la frecuencia con que tu contenido aparece en feeds', suggested_target: '50,000 impresiones/mes', frequency: 'Semanal' },
  { id: 7, name: 'Clicks en enlace', description: 'Clicks al link en bio o en stories/posts', unit: 'clicks', category: 'redes_sociales', formula: 'Total de clicks en enlaces de tu contenido', example: 'Si tu link en bio recibio 200 clicks y stories 150: total 350', benefit: 'Mide la capacidad del contenido de generar trafico a tu web o landing', suggested_target: '500 clicks/mes', frequency: 'Semanal' },
  { id: 8, name: 'Guardados/Saves', description: 'Personas que guardaron el contenido para ver despues', unit: 'guardados', category: 'redes_sociales', formula: 'Total de saves en todos los posts del periodo', example: 'Si 10 posts tuvieron un promedio de 50 saves c/u = 500 guardados', benefit: 'El save es la interaccion mas valiosa; indica contenido de alto valor', suggested_target: '300 guardados/mes', frequency: 'Semanal' },
  { id: 9, name: 'Stories completadas', description: '% de personas que vieron todas las stories de la secuencia', unit: '%', category: 'redes_sociales', formula: '(Viewers de ultima story / Viewers de primera story) x 100', example: 'Si 1,000 vieron la primera y 600 la ultima: 60%', benefit: 'Mide que tan enganchada esta tu audiencia con tu narrativa diaria', suggested_target: '50-70%', frequency: 'Semanal' },
  { id: 10, name: 'Costo por resultado (pauta)', description: 'Inversion publicitaria / resultados obtenidos', unit: '$', category: 'redes_sociales', formula: 'Inversion total en ads / Resultados obtenidos', example: 'Si invertiste $500 y obtuviste 100 leads: CPR = $5', benefit: 'Mide la eficiencia de tu inversion publicitaria', suggested_target: 'Depende del sector', frequency: 'Quincenal' },

  // FINANCIERO (8)
  { id: 11, name: 'Ingresos mensuales', description: 'Total facturado en el mes', unit: '$', category: 'financiero', formula: 'Suma de todas las facturas emitidas en el mes', example: 'Si facturaste $5,000 + $3,000 + $2,000 = $10,000', benefit: 'El indicador base de salud financiera del negocio', suggested_target: 'Variable segun agencia', frequency: 'Mensual' },
  { id: 12, name: 'Margen de ganancia', description: '((Ingresos-Gastos)/Ingresos)x100', unit: '%', category: 'financiero', formula: '((Ingresos - Gastos) / Ingresos) x 100', example: 'Ingresos $10,000 - Gastos $6,000 = ($4,000/$10,000) x 100 = 40%', benefit: 'Indica cuanto queda realmente de cada dolar facturado', suggested_target: '30-50%', frequency: 'Mensual' },
  { id: 13, name: 'Ticket promedio por cliente', description: 'Ingresos totales / cantidad de clientes', unit: '$', category: 'financiero', formula: 'Ingresos totales del periodo / Cantidad de clientes activos', example: 'Si facturas $10,000 con 5 clientes: ticket = $2,000', benefit: 'Ayuda a evaluar si estas cobrando lo suficiente por tus servicios', suggested_target: '$1,500-3,000/mes', frequency: 'Mensual' },
  { id: 14, name: 'Tasa de crecimiento mensual', description: '((Mes actual - Mes anterior)/Mes anterior)x100', unit: '%', category: 'financiero', formula: '((Ingresos mes actual - Ingresos mes anterior) / Ingresos mes anterior) x 100', example: 'Mes pasado $8,000, este mes $10,000: ((10,000-8,000)/8,000) x 100 = 25%', benefit: 'Mide el momentum de crecimiento del negocio', suggested_target: '10-20%', frequency: 'Mensual' },
  { id: 15, name: 'Costo de adquisicion de cliente', description: 'Inversion en conseguir clientes / nuevos clientes', unit: '$', category: 'financiero', formula: 'Gastos de marketing y ventas / Clientes nuevos conseguidos', example: 'Si invertiste $1,000 en marketing y conseguiste 2 clientes: CAC = $500', benefit: 'Permite saber cuanto cuesta cada nuevo cliente para evaluar rentabilidad', suggested_target: '<30% del ticket mensual', frequency: 'Mensual' },
  { id: 16, name: 'Valor de vida del cliente (LTV)', description: 'Ticket promedio x meses de retencion', unit: '$', category: 'financiero', formula: 'Ticket promedio mensual x Promedio de meses de permanencia', example: 'Si el ticket es $2,000 y el cliente promedio dura 8 meses: LTV = $16,000', benefit: 'Ayuda a tomar decisiones sobre cuanto invertir para conseguir clientes', suggested_target: '>3x CAC', frequency: 'Mensual' },
  { id: 17, name: 'Rentabilidad por cliente', description: '(Ingresos cliente - Costos cliente)/Ingresosx100', unit: '%', category: 'financiero', formula: '((Ingresos del cliente - Costos asignados al cliente) / Ingresos del cliente) x 100', example: 'Cliente factura $3,000, costos $1,800: (1,200/3,000) x 100 = 40%', benefit: 'Identifica que clientes son mas rentables y cuales podrian no convenir', suggested_target: '>30%', frequency: 'Mensual' },
  { id: 18, name: 'Dias promedio de cobro', description: 'Promedio de dias entre factura y pago', unit: 'dias', category: 'financiero', formula: 'Suma de (fecha pago - fecha factura) / cantidad de facturas', example: 'Si 3 facturas se cobraron en 15, 30 y 45 dias: promedio = 30 dias', benefit: 'Mide la salud del flujo de caja y la velocidad de cobro', suggested_target: '<30 dias', frequency: 'Mensual' },

  // CLIENTES (6)
  { id: 19, name: 'Tasa de retencion de clientes', description: '(Clientes que siguen/Clientes inicio)x100', unit: '%', category: 'clientes', formula: '(Clientes activos al final del periodo / Clientes al inicio del periodo) x 100', example: 'Empezaste con 10 clientes y terminaste con 9: (9/10) x 100 = 90%', benefit: 'Un cliente retenido es mucho mas rentable que uno nuevo', suggested_target: '>85%', frequency: 'Mensual' },
  { id: 20, name: 'Net Promoter Score (NPS)', description: '% promotores - % detractores (encuesta 0-10)', unit: 'puntos', category: 'clientes', formula: '% de clientes que dieron 9-10 (promotores) - % que dieron 0-6 (detractores)', example: 'Si 60% son promotores y 20% detractores: NPS = 40', benefit: 'Mide la probabilidad de que tus clientes te recomienden', suggested_target: '>50 puntos', frequency: 'Mensual' },
  { id: 21, name: 'Tasa de churn', description: 'Clientes perdidos en el mes / total clientes x100', unit: '%', category: 'clientes', formula: '(Clientes perdidos en el periodo / Total de clientes al inicio) x 100', example: 'Si perdiste 1 de 10 clientes: (1/10) x 100 = 10%', benefit: 'Alerta temprana de problemas de satisfaccion o competencia', suggested_target: '<5%', frequency: 'Mensual' },
  { id: 22, name: 'Tiempo promedio de onboarding', description: 'Dias desde firma hasta primer entregable', unit: 'dias', category: 'clientes', formula: 'Suma de dias de onboarding / Cantidad de clientes onboardeados', example: 'Si 3 clientes tardaron 7, 10 y 14 dias: promedio = 10.3 dias', benefit: 'Un onboarding rapido genera confianza y reduce la ansiedad del cliente', suggested_target: '<14 dias', frequency: 'Mensual' },
  { id: 23, name: 'Satisfaccion del cliente (CSAT)', description: 'Promedio de calificacion en encuestas de satisfaccion', unit: '/10', category: 'clientes', formula: 'Suma de calificaciones / Cantidad de respuestas', example: 'Si 5 clientes calificaron 8, 9, 7, 10, 8: promedio = 8.4', benefit: 'Mide directamente como se sienten tus clientes con el servicio', suggested_target: '>8/10', frequency: 'Mensual' },
  { id: 24, name: 'Clientes activos', description: 'Total de clientes con contrato vigente', unit: 'clientes', category: 'clientes', formula: 'Conteo de clientes con estado activo', example: 'Si tienes 12 contratos vigentes, tu KPI es 12', benefit: 'Base para calcular capacidad operativa y proyecciones de ingreso', suggested_target: 'Variable', frequency: 'Mensual' },

  // PROYECTOS Y EQUIPO (8)
  { id: 25, name: 'Tasa de entrega a tiempo', description: 'Proyectos entregados en fecha / total x100', unit: '%', category: 'proyectos_equipo', formula: '(Proyectos entregados en fecha / Total de proyectos entregados) x 100', example: 'Si entregaste 8 de 10 proyectos a tiempo: (8/10) x 100 = 80%', benefit: 'La puntualidad es clave para la confianza y retencion de clientes', suggested_target: '>85%', frequency: 'Mensual' },
  { id: 26, name: 'Tiempo promedio de produccion', description: 'Dias desde brief hasta entrega final', unit: 'dias', category: 'proyectos_equipo', formula: 'Suma de dias de produccion / Cantidad de proyectos entregados', example: 'Si 3 proyectos tardaron 5, 7 y 10 dias: promedio = 7.3 dias', benefit: 'Identifica cuellos de botella y permite mejorar procesos', suggested_target: 'Variable por tipo', frequency: 'Mensual' },
  { id: 27, name: 'Tasa de aprobacion en primera revision', description: 'Entregables aprobados sin cambios / total x100', unit: '%', category: 'proyectos_equipo', formula: '(Entregables aprobados en primera revision / Total entregables) x 100', example: 'Si de 20 entregables, 15 fueron aprobados sin cambios: 75%', benefit: 'Indica la calidad del trabajo y la alineacion con el cliente', suggested_target: '>70%', frequency: 'Quincenal' },
  { id: 28, name: 'Productividad del equipo', description: 'Tareas completadas / tareas asignadas x100', unit: '%', category: 'proyectos_equipo', formula: '(Tareas completadas / Tareas asignadas) x 100', example: 'Si el equipo completo 45 de 50 tareas: (45/50) x 100 = 90%', benefit: 'Mide la eficiencia operativa del equipo', suggested_target: '>80%', frequency: 'Semanal' },
  { id: 29, name: 'Tareas completadas por periodo', description: 'Total de tareas marcadas como done en el periodo', unit: 'tareas', category: 'proyectos_equipo', formula: 'Conteo de tareas con estado "completado" en el periodo', example: 'Si se completaron 45 tareas esta semana, el valor es 45', benefit: 'Mide la velocidad de ejecucion del equipo', suggested_target: 'Variable', frequency: 'Semanal' },
  { id: 30, name: 'Tasa de cumplimiento de deadlines', description: 'Tareas entregadas en fecha / total x100', unit: '%', category: 'proyectos_equipo', formula: '(Tareas completadas antes del deadline / Total de tareas con deadline) x 100', example: 'Si 40 de 50 tareas se entregaron a tiempo: 80%', benefit: 'Complementa la tasa de entrega a nivel de tareas individuales', suggested_target: '>80%', frequency: 'Semanal' },
  { id: 31, name: 'Horas de retrabajo', description: 'Horas dedicadas a corregir entregables rechazados', unit: 'horas', category: 'proyectos_equipo', formula: 'Suma de horas invertidas en correcciones y re-entregas', example: 'Si se dedicaron 12 horas a correcciones esta semana', benefit: 'El retrabajo es costo oculto; medirlo ayuda a reducirlo', suggested_target: '<10% del total', frequency: 'Semanal' },
  { id: 32, name: 'Carga de trabajo por miembro', description: 'Tareas activas asignadas por persona del equipo', unit: 'tareas', category: 'proyectos_equipo', formula: 'Total de tareas activas / Cantidad de miembros del equipo', example: 'Si hay 30 tareas activas y 5 miembros: 6 tareas por persona', benefit: 'Evita la sobrecarga y el burnout distribuyendo mejor el trabajo', suggested_target: '5-8 tareas/persona', frequency: 'Semanal' },

  // IA Y AUTOMATIZACION (8)
  { id: 33, name: 'Tiempo ahorrado con IA', description: 'Horas que la IA reemplazo de trabajo manual por mes', unit: 'horas', category: 'ia_automatizacion', formula: 'Estimacion de horas manuales ahorradas por el uso de IA', example: 'Si la IA ahorro 2 horas diarias x 20 dias = 40 horas/mes', benefit: 'Cuantifica el ROI real de las herramientas de IA en tu agencia', suggested_target: '40 horas/mes', frequency: 'Mensual' },
  { id: 34, name: 'Contenido generado con IA', description: '% de piezas de contenido con asistencia de IA', unit: '%', category: 'ia_automatizacion', formula: '(Piezas con asistencia de IA / Total de piezas producidas) x 100', example: 'Si de 100 piezas, 60 usaron IA: 60%', benefit: 'Mide el nivel de adopcion de IA en la produccion de contenido', suggested_target: '40-70%', frequency: 'Quincenal' },
  { id: 35, name: 'Prompts usados por semana', description: 'Cantidad de consultas a herramientas de IA por semana', unit: 'prompts', category: 'ia_automatizacion', formula: 'Conteo de consultas realizadas a herramientas de IA', example: 'Si el equipo hizo 150 consultas a ChatGPT/Claude en la semana', benefit: 'Indica que tan integrada esta la IA en el flujo de trabajo diario', suggested_target: '100-200/semana', frequency: 'Semanal' },
  { id: 36, name: 'ROI de herramientas IA', description: 'Valor generado por IA / costo de herramientas IA x100', unit: '%', category: 'ia_automatizacion', formula: '(Valor generado o ahorrado / Costo de suscripciones IA) x 100', example: 'Si la IA ahorra $2,000 y cuesta $200/mes: (2,000/200) x 100 = 1,000%', benefit: 'Justifica la inversion en herramientas de IA con datos concretos', suggested_target: '>300%', frequency: 'Mensual' },
  { id: 37, name: 'Reduccion de tiempo de edicion', description: '% de reduccion vs proceso manual anterior', unit: '%', category: 'ia_automatizacion', formula: '((Tiempo manual - Tiempo con IA) / Tiempo manual) x 100', example: 'Si antes tardabas 4 horas y ahora 1.5: ((4-1.5)/4) x 100 = 62.5%', benefit: 'Demuestra el impacto de la IA en la eficiencia operativa', suggested_target: '>40%', frequency: 'Mensual' },
  { id: 38, name: 'Tasa de adopcion de IA en equipo', description: 'Miembros usando IA regularmente / total equipo x100', unit: '%', category: 'ia_automatizacion', formula: '(Miembros que usan IA al menos 3x/semana / Total miembros) x 100', example: 'Si 4 de 5 miembros usan IA regularmente: 80%', benefit: 'La IA solo funciona si el equipo la usa; mide la adopcion real', suggested_target: '>75%', frequency: 'Quincenal' },
  { id: 39, name: 'Calidad de outputs IA', description: 'Promedio de calificacion de outputs de IA (autoevaluacion 1-10)', unit: '/10', category: 'ia_automatizacion', formula: 'Promedio de calificaciones que el equipo da a los outputs de IA', example: 'Si 5 outputs fueron calificados 7, 8, 6, 9, 8: promedio = 7.6', benefit: 'Asegura que la IA no solo sea rapida sino tambien de calidad', suggested_target: '>7/10', frequency: 'Quincenal' },
  { id: 40, name: 'Automatizaciones activas', description: 'Procesos automatizados funcionando en la agencia', unit: 'automatizaciones', category: 'ia_automatizacion', formula: 'Conteo de automatizaciones (Zapier, Make, scripts, etc.) activas', example: 'Si tienes 8 zaps y 3 scripts funcionando: 11 automatizaciones', benefit: 'Mas automatizaciones = menos trabajo repetitivo = mas escala', suggested_target: '10+ activas', frequency: 'Mensual' },
]

const CATEGORY_COLORS: Record<LibraryCategory, string> = {
  redes_sociales: '#8b5cf6',
  financiero: '#059669',
  clientes: '#2563eb',
  proyectos_equipo: '#d97706',
  ia_automatizacion: '#dc2626',
}

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  redes_sociales: 'Redes Sociales',
  financiero: 'Financiero',
  clientes: 'Clientes',
  proyectos_equipo: 'Proyectos y Equipo',
  ia_automatizacion: 'IA y Automatizacion',
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
]

const FREQUENCY_MAP: Record<string, string> = {
  Diaria: 'daily',
  Semanal: 'weekly',
  Quincenal: 'biweekly',
  Mensual: 'monthly',
}

/* ────────────────────────────────────────────
   Main Page Component
   ──────────────────────────────────────────── */
export default function KPIsPage() {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')

  // Existing wizard (inline)
  const [showForm, setShowForm] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState({ name: '', description: '', unit: 'numero', target_value: '', color: '#2563eb', client_id: '', current_value: '', frequency: 'monthly' })
  const [showRecordForm, setShowRecordForm] = useState<string | null>(null)
  const [recordValue, setRecordValue] = useState('')
  const [recordNotes, setRecordNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit / Delete state
  const [editKpi, setEditKpi] = useState<KPI | null>(null)
  const [editData, setEditData] = useState({ name: '', target_value: '', unit: '', client_id: '', category: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [deleteKpiId, setDeleteKpiId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Library modal state
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryStep, setLibraryStep] = useState<'browse' | 'tutorial' | 'configure' | 'confirm'>('browse')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryCategory, setLibraryCategory] = useState<LibraryCategory | 'all'>('all')
  const [selectedLibKpi, setSelectedLibKpi] = useState<LibraryKPI | null>(null)
  const [libConfig, setLibConfig] = useState({ name: '', client_id: '', target_value: '', current_value: '', frequency: 'monthly' })
  const [libSaving, setLibSaving] = useState(false)

  const KPI_TEMPLATES = [
    { icon: '📱', name: 'Alcance total', description: 'Personas unicas que vieron tu contenido', unit: 'personas', target: '10000' },
    { icon: '❤️', name: 'Tasa de engagement', description: 'Likes + comentarios + compartidos / alcance x 100', unit: 'porcentaje', target: '5' },
    { icon: '👥', name: 'Nuevos seguidores', description: 'Crecimiento de la comunidad por periodo', unit: 'numero', target: '500' },
    { icon: '🎥', name: 'Reproducciones de video', description: 'Total de views en Reels, TikTok o YouTube', unit: 'numero', target: '50000' },
    { icon: '💰', name: 'Conversiones / Ventas', description: 'Ventas o leads generados desde contenido', unit: 'numero', target: '50' },
  ]

  function selectTemplate(tmpl: typeof KPI_TEMPLATES[0] | null) {
    if (tmpl) {
      setWizardData(prev => ({ ...prev, name: tmpl.name, description: tmpl.description, unit: tmpl.unit, target_value: tmpl.target }))
    } else {
      setWizardData(prev => ({ ...prev, name: '', description: '', unit: 'numero', target_value: '' }))
    }
    setWizardStep(2)
  }

  function openWizard() { setShowForm(true); setWizardStep(1) }

  const fetchKpis = useCallback(async () => {
    setLoading(true)
    const [kRes, cRes] = await Promise.all([
      fetch(filterClient ? `/api/kpis?clientId=${filterClient}` : '/api/kpis'),
      fetch('/api/clients'),
    ])
    if (kRes.ok) { const j = await kRes.json(); setKpis(j.data || []) }
    if (cRes.ok) { const j = await cRes.json(); setClients(j.data || []) }
    setLoading(false)
  }, [filterClient])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  async function handleCreate() {
    setSaving(true)
    await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wizardData.name, description: wizardData.description,
        client_id: wizardData.client_id || undefined, unit: wizardData.unit,
        target_value: parseFloat(wizardData.target_value) || 0,
        current_value: parseFloat(wizardData.current_value) || 0,
        frequency: wizardData.frequency, category: 'performance',
        color: wizardData.color,
      }),
    })
    setSaving(false); setShowForm(false)
    setWizardData({ name: '', description: '', unit: 'numero', target_value: '', color: '#2563eb', client_id: '', current_value: '', frequency: 'monthly' })
    fetchKpis()
  }

  async function handleRecord(kpiId: string) {
    if (!recordValue) return
    setSaving(true)
    const now = new Date()
    await fetch(`/api/kpis/${kpiId}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: parseFloat(recordValue),
        period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
        notes: recordNotes,
      }),
    })
    setSaving(false); setShowRecordForm(null); setRecordValue(''); setRecordNotes(''); fetchKpis()
  }

  function openEditKpi(kpi: KPI) {
    setEditKpi(kpi)
    setEditData({
      name: kpi.name,
      target_value: String(kpi.target_value),
      unit: kpi.unit,
      client_id: kpi.client_id || '',
      category: kpi.category || '',
    })
  }

  async function handleEditKpi() {
    if (!editKpi) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/kpis/${editKpi.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          target_value: parseFloat(editData.target_value) || 0,
          unit: editData.unit,
        }),
      })
      if (res.ok) {
        setEditKpi(null)
        fetchKpis()
      }
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteKpi() {
    if (!deleteKpiId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/kpis/${deleteKpiId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteKpiId(null)
        fetchKpis()
      }
    } finally {
      setDeleting(false)
    }
  }

  function getProgress(kpi: KPI) {
    if (!kpi.target_value) return 0
    return Math.min(100, (Number(kpi.current_value) / Number(kpi.target_value)) * 100)
  }

  function getTrend(kpi: KPI): 'up' | 'down' | 'none' {
    const records = kpi.kpi_records || []
    if (records.length < 2) return 'none'
    const sorted = [...records].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    return sorted[0].value >= sorted[1].value ? 'up' : 'down'
  }

  /* ────────────────────────────────────────
     Library Modal Logic
     ──────────────────────────────────────── */
  const filteredLibrary = useMemo(() => {
    let items = KPI_LIBRARY
    if (libraryCategory !== 'all') {
      items = items.filter(k => k.category === libraryCategory)
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase()
      items = items.filter(k =>
        k.name.toLowerCase().includes(q) ||
        k.description.toLowerCase().includes(q) ||
        CATEGORY_LABELS[k.category].toLowerCase().includes(q)
      )
    }
    return items
  }, [libraryCategory, librarySearch])

  function openLibrary() {
    setLibraryOpen(true)
    setLibraryStep('browse')
    setLibrarySearch('')
    setLibraryCategory('all')
    setSelectedLibKpi(null)
  }

  function selectLibKpi(kpi: LibraryKPI) {
    setSelectedLibKpi(kpi)
    setLibraryStep('tutorial')
  }

  function goToConfigure() {
    if (!selectedLibKpi) return
    setLibConfig({
      name: selectedLibKpi.name,
      client_id: '',
      target_value: '',
      current_value: '',
      frequency: FREQUENCY_MAP[selectedLibKpi.frequency] || 'monthly',
    })
    setLibraryStep('configure')
  }

  async function handleLibraryCreate() {
    if (!selectedLibKpi) return
    setLibSaving(true)
    const unitMap: Record<string, string> = {
      '%': 'porcentaje', '$': 'moneda', 'personas': 'personas', 'seguidores': 'numero',
      'views': 'numero', 'impresiones': 'numero', 'clicks': 'numero', 'guardados': 'numero',
      'puntos': 'numero', 'dias': 'numero', '/10': 'numero', 'clientes': 'numero',
      'tareas': 'numero', 'horas': 'numero', 'prompts': 'numero', 'automatizaciones': 'numero',
    }
    const categoryMap: Record<LibraryCategory, string> = {
      redes_sociales: 'performance',
      financiero: 'financiero',
      clientes: 'satisfaccion',
      proyectos_equipo: 'operacional',
      ia_automatizacion: 'performance',
    }

    const res = await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: libConfig.name,
        description: selectedLibKpi.description,
        client_id: libConfig.client_id || undefined,
        unit: unitMap[selectedLibKpi.unit] || 'numero',
        target_value: parseFloat(libConfig.target_value) || 0,
        current_value: parseFloat(libConfig.current_value) || 0,
        frequency: libConfig.frequency,
        category: categoryMap[selectedLibKpi.category] || 'performance',
        color: CATEGORY_COLORS[selectedLibKpi.category],
      }),
    })

    setLibSaving(false)
    if (res.ok) {
      setLibraryStep('confirm')
      fetchKpis()
    }
  }

  function closeLibrary() {
    setLibraryOpen(false)
    setSelectedLibKpi(null)
  }

  /* ────────────────────────────────────────
     Render
     ──────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <InfoBanner id="kpis" title="KPIs y Metricas" description="Define y trackea indicadores clave de rendimiento para cada cliente." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('nav.kpis')}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Seguimiento de indicadores clave</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-white border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="">{t('projects.allClients')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => {
              const exportData = kpis.map(k => ({
                nombre: k.name,
                cliente: k.clients?.name || 'Sin cliente',
                valor_actual: k.current_value,
                valor_objetivo: k.target_value,
                unidad: k.unit,
                progreso: `${Math.round(getProgress(k))}%`,
                categoria: k.category,
                frecuencia: k.frequency,
              }))
              downloadCSV(exportData as Record<string, unknown>[], 'kpis', [
                { key: 'nombre', label: 'Nombre' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'valor_actual', label: 'Valor actual' },
                { key: 'valor_objetivo', label: 'Valor objetivo' },
                { key: 'unidad', label: 'Unidad' },
                { key: 'progreso', label: 'Progreso' },
                { key: 'categoria', label: 'Categoria' },
                { key: 'frecuencia', label: 'Frecuencia' },
              ])
            }}
            disabled={kpis.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} strokeWidth={1.5} /> CSV
          </button>
          <button
            onClick={() => {
              const exportData = kpis.map(k => ({
                nombre: k.name,
                cliente: k.clients?.name || 'Sin cliente',
                valor_actual: k.current_value,
                valor_objetivo: k.target_value,
                unidad: k.unit,
                progreso: `${Math.round(getProgress(k))}%`,
                categoria: k.category,
                frecuencia: k.frequency,
              }))
              downloadPDF({
                title: 'KPIs y Metricas',
                subtitle: filterClient ? `Cliente: ${clients.find(c => c.id === filterClient)?.name || ''}` : 'Todos los clientes',
                filename: 'kpis',
                columns: [
                  { key: 'nombre', label: 'Nombre' },
                  { key: 'cliente', label: 'Cliente' },
                  { key: 'valor_actual', label: 'Valor actual' },
                  { key: 'valor_objetivo', label: 'Objetivo' },
                  { key: 'progreso', label: 'Progreso' },
                  { key: 'frecuencia', label: 'Frecuencia' },
                ],
                data: exportData as Record<string, unknown>[],
              })
            }}
            disabled={kpis.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} strokeWidth={1.5} /> PDF
          </button>
          <button onClick={openLibrary} className="flex items-center gap-2 bg-white border border-[var(--border-base)] text-[var(--text-primary)] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--bg-muted)] transition-colors">
            <BookOpen size={16} strokeWidth={1.5} /> Biblioteca de KPIs
          </button>
          <button onClick={openWizard} className="flex items-center gap-2 bg-[var(--blue)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} strokeWidth={1.5} /> Nuevo KPI
          </button>
        </div>
      </div>

      {/* ── Existing inline wizard ── */}
      {showForm && (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nuevo KPI — Paso {wizardStep} de 3</h3>
              <div className="flex gap-1">{[1,2,3].map(s => <div key={s} className={cn('h-1.5 w-8 rounded-full', s <= wizardStep ? 'bg-[var(--blue)]' : 'bg-slate-200')} />)}</div>
            </div>
            <button type="button" onClick={() => setShowForm(false)}><X size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" /></button>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted)]">Elegi un tipo de KPI o crea uno personalizado</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {KPI_TEMPLATES.map((tmpl, i) => (
                  <button key={i} onClick={() => selectTemplate(tmpl)} className="text-left p-4 rounded-xl border border-[var(--border-base)] hover:border-[var(--blue)] hover:bg-blue-50/50 transition-colors">
                    <span className="text-2xl">{tmpl.icon}</span>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-2">{tmpl.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{tmpl.description}</p>
                    <p className="text-xs text-[var(--blue)] mt-1 font-medium">Meta: {tmpl.target}/{tmpl.unit === 'porcentaje' ? '%' : 'mes'}</p>
                  </button>
                ))}
                <button onClick={() => selectTemplate(null)} className="text-left p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[var(--blue)] transition-colors">
                  <span className="text-2xl">✏️</span>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-2">KPI Personalizado</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Defini tu propio indicador</p>
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">Configura los detalles del KPI</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Nombre *</label><input value={wizardData.name} onChange={e => setWizardData(p => ({...p, name: e.target.value}))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Cliente</label><select value={wizardData.client_id} onChange={e => setWizardData(p => ({...p, client_id: e.target.value}))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm"><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Descripcion</label><input value={wizardData.description} onChange={e => setWizardData(p => ({...p, description: e.target.value}))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm" /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Valor objetivo *</label><input type="number" step="0.01" value={wizardData.target_value} onChange={e => setWizardData(p => ({...p, target_value: e.target.value}))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Unidad</label><select value={wizardData.unit} onChange={e => setWizardData(p => ({...p, unit: e.target.value}))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm"><option value="numero">Numero</option><option value="porcentaje">Porcentaje</option><option value="personas">Personas</option><option value="moneda">Moneda</option></select></div>
                <div><label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Valor actual</label><input type="number" step="0.01" value={wizardData.current_value} onChange={e => setWizardData(p => ({...p, current_value: e.target.value}))} placeholder="0" className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setWizardStep(1)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Atras</button>
                <button onClick={() => setWizardStep(3)} disabled={!wizardData.name || !wizardData.target_value} className="bg-[var(--blue)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">Con que frecuencia revisas este KPI?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'daily', label: 'Diaria', desc: 'Ideal para metricas de alto volumen' },
                  { value: 'weekly', label: 'Semanal', desc: 'Perfecto para engagement y seguidores' },
                  { value: 'biweekly', label: 'Quincenal', desc: 'Para metricas de crecimiento moderado' },
                  { value: 'monthly', label: 'Mensual', desc: 'Para resultados de conversion y ventas' },
                ].map(f => (
                  <button key={f.value} onClick={() => setWizardData(p => ({...p, frequency: f.value}))} className={cn('text-left p-4 rounded-xl border-2 transition-all', wizardData.frequency === f.value ? 'border-[var(--blue)] bg-blue-50' : 'border-[var(--border-base)] hover:border-blue-300')}>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{f.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{f.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setWizardStep(2)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Atras</button>
                <button onClick={handleCreate} disabled={saving} className="bg-[var(--blue)] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin inline mr-2" /> : null} Crear KPI
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl border border-[var(--border-base)] bg-white animate-pulse" />)}
        </div>
      ) : kpis.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-12 text-center">
          <BarChart2 size={48} strokeWidth={1.5} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No hay KPIs configurados.</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Crea tu primer KPI o explora la biblioteca de 40 KPIs predefinidos.</p>
          <button onClick={openLibrary} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--blue)] hover:underline">
            <BookOpen size={16} strokeWidth={1.5} /> Explorar Biblioteca de KPIs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => {
            const progress = getProgress(kpi)
            const trend = getTrend(kpi)
            const belowTarget = Number(kpi.current_value) < Number(kpi.target_value) * 0.7
            const records = [...(kpi.kpi_records || [])].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).slice(-6)

            return (
              <div key={kpi.id} className="rounded-xl border border-[var(--border-base)] bg-white p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: kpi.color }} />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{kpi.name}</h3>
                    </div>
                    {kpi.clients && <p className="text-xs text-[var(--text-muted)] mt-0.5">{kpi.clients.name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {belowTarget && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertTriangle size={12} strokeWidth={1.5} /> Bajo</span>}
                    {trend === 'up' && <TrendingUp size={16} strokeWidth={1.5} className="text-green-500" />}
                    {trend === 'down' && <TrendingDown size={16} strokeWidth={1.5} className="text-red-500" />}
                    <button onClick={() => openEditKpi(kpi)} className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar KPI">
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setDeleteKpiId(kpi.id)} className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar KPI">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{Number(kpi.current_value).toLocaleString()}</p>
                    <p className="text-xs text-[var(--text-muted)]">de {Number(kpi.target_value).toLocaleString()} {kpi.unit}</p>
                  </div>
                  <div className="relative h-14 w-14">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={kpi.color} strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">{Math.round(progress)}%</span>
                  </div>
                </div>
                {records.length > 1 && (
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={records.map(r => ({ v: r.value }))}>
                        <Line type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <button onClick={() => setShowRecordForm(showRecordForm === kpi.id ? null : kpi.id)} className="w-full text-center text-xs text-[var(--blue)] hover:opacity-80 font-medium py-1">Registrar valor</button>
                {showRecordForm === kpi.id && (
                  <div className="space-y-2 border-t border-[var(--border-base)] pt-3">
                    <input type="number" step="0.01" value={recordValue} onChange={e => setRecordValue(e.target.value)} placeholder="Valor actual" className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm" />
                    <input value={recordNotes} onChange={e => setRecordNotes(e.target.value)} placeholder="Notas (opcional)" className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => handleRecord(kpi.id)} disabled={saving || !recordValue} className="w-full bg-[var(--blue)] text-white rounded-lg py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar registro'}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit KPI Modal ── */}
      <Dialog.Root open={!!editKpi} onOpenChange={open => { if (!open) setEditKpi(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-[var(--border-base)] bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">Editar KPI</Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--text-muted)]">Modifica los datos del KPI</Dialog.Description>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Nombre *</label>
                <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Valor objetivo</label>
                  <input type="number" step="0.01" value={editData.target_value} onChange={e => setEditData(p => ({ ...p, target_value: e.target.value }))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Unidad</label>
                  <select value={editData.unit} onChange={e => setEditData(p => ({ ...p, unit: e.target.value }))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]">
                    <option value="numero">Numero</option>
                    <option value="porcentaje">Porcentaje</option>
                    <option value="personas">Personas</option>
                    <option value="moneda">Moneda</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Cliente</label>
                <select value={editData.client_id} onChange={e => setEditData(p => ({ ...p, client_id: e.target.value }))} className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]">
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditKpi(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium px-4 py-2">{t('common.cancel')}</button>
              <button onClick={handleEditKpi} disabled={editSaving || !editData.name} className="bg-[var(--blue)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {editSaving ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin inline mr-1" /> : null}
                {t('common.save')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete KPI Confirmation ── */}
      <Dialog.Root open={!!deleteKpiId} onOpenChange={open => { if (!open) setDeleteKpiId(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-[var(--border-base)] bg-white shadow-xl p-6 space-y-4">
            <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">Eliminar KPI</Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--text-muted)]">
              Este KPI y todos sus registros seran eliminados permanentemente. Esta accion no se puede deshacer.
            </Dialog.Description>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeleteKpiId(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium px-4 py-2">{t('common.cancel')}</button>
              <button onClick={handleDeleteKpi} disabled={deleting} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin inline mr-1" /> : null}
                {t('common.delete')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Library Modal ── */}
      <Dialog.Root open={libraryOpen} onOpenChange={setLibraryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[720px] max-h-[85vh] rounded-xl border border-[var(--border-base)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-base)] shrink-0">
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  {libraryStep === 'browse' && 'Biblioteca de KPIs'}
                  {libraryStep === 'tutorial' && selectedLibKpi?.name}
                  {libraryStep === 'configure' && 'Configurar KPI'}
                  {libraryStep === 'confirm' && 'KPI Creado'}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-[var(--text-muted)] mt-0.5">
                  {libraryStep === 'browse' && '40 KPIs predefinidos para agencias de marketing'}
                  {libraryStep === 'tutorial' && CATEGORY_LABELS[selectedLibKpi?.category || 'redes_sociales']}
                  {libraryStep === 'configure' && 'Ajusta los valores para tu agencia'}
                  {libraryStep === 'confirm' && 'El KPI fue agregado correctamente'}
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            {/* Step indicators */}
            {libraryStep !== 'browse' && (
              <div className="px-6 pt-3 pb-0 shrink-0">
                <div className="flex gap-1">
                  {['browse', 'tutorial', 'configure'].map((s, i) => (
                    <div key={s} className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      ['browse', 'tutorial', 'configure', 'confirm'].indexOf(libraryStep) >= i ? 'bg-[var(--blue)]' : 'bg-slate-200'
                    )} />
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* STEP: Browse */}
              {libraryStep === 'browse' && (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={e => setLibrarySearch(e.target.value)}
                      placeholder={`${t('common.search')}...`}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--border-base)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>

                  {/* Category tabs */}
                  <div className="flex gap-1.5 flex-wrap">
                    {LIBRARY_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setLibraryCategory(cat.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          libraryCategory === cat.value
                            ? 'bg-[var(--blue)] text-white'
                            : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        {cat.icon}
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {filteredLibrary.map(kpi => (
                      <button
                        key={kpi.id}
                        onClick={() => selectLibKpi(kpi)}
                        className="text-left p-4 rounded-xl border border-[var(--border-base)] hover:border-[var(--blue)] hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: CATEGORY_COLORS[kpi.category] }} />
                          <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mt-2 leading-snug">{kpi.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{kpi.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)]">{kpi.unit}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{kpi.frequency}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredLibrary.length === 0 && (
                    <div className="text-center py-8">
                      <Search size={24} strokeWidth={1.5} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-muted)]">No se encontraron KPIs con esa busqueda.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP: Tutorial */}
              {libraryStep === 'tutorial' && selectedLibKpi && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {/* Que mide */}
                    <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-base)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Que mide?</h4>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{selectedLibKpi.description}</p>
                    </div>

                    {/* Como se calcula */}
                    <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-base)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Como se calcula?</h4>
                      </div>
                      <p className="text-sm font-mono text-[var(--text-primary)] bg-white px-3 py-2 rounded-lg border border-[var(--border-base)] mb-2">{selectedLibKpi.formula}</p>
                      <p className="text-xs text-[var(--text-muted)] italic">Ejemplo: {selectedLibKpi.example}</p>
                    </div>

                    {/* Para que sirve */}
                    <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-base)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={16} strokeWidth={1.5} className="text-amber-500" />
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Para que sirve?</h4>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{selectedLibKpi.benefit}</p>
                    </div>

                    {/* Meta sugerida + Frecuencia */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-base)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Target size={16} strokeWidth={1.5} className="text-green-500" />
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Meta sugerida</h4>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">{selectedLibKpi.suggested_target}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-base)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={16} strokeWidth={1.5} className="text-purple-500" />
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Frecuencia recomendada</h4>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">{selectedLibKpi.frequency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP: Configure */}
              {libraryStep === 'configure' && selectedLibKpi && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Nombre del KPI</label>
                    <input
                      value={libConfig.name}
                      onChange={e => setLibConfig(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Cliente</label>
                    <select
                      value={libConfig.client_id}
                      onChange={e => setLibConfig(p => ({ ...p, client_id: e.target.value }))}
                      className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]"
                    >
                      <option value="">Sin cliente (KPI global)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Valor objetivo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={libConfig.target_value}
                        onChange={e => setLibConfig(p => ({ ...p, target_value: e.target.value }))}
                        placeholder={selectedLibKpi.suggested_target}
                        className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Valor actual</label>
                      <input
                        type="number"
                        step="0.01"
                        value={libConfig.current_value}
                        onChange={e => setLibConfig(p => ({ ...p, current_value: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-white border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block font-medium">Frecuencia de medicion</label>
                    <div className="grid grid-cols-4 gap-2">
                      {FREQUENCY_OPTIONS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => setLibConfig(p => ({ ...p, frequency: f.value }))}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                            libConfig.frequency === f.value
                              ? 'border-[var(--blue)] bg-blue-50 text-[var(--blue)]'
                              : 'border-[var(--border-base)] text-[var(--text-muted)] hover:border-blue-300'
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-700">
                      <strong>Meta sugerida:</strong> {selectedLibKpi.suggested_target} | <strong>Unidad:</strong> {selectedLibKpi.unit}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP: Confirm */}
              {libraryStep === 'confirm' && selectedLibKpi && (
                <div className="text-center py-8 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
                    <Check size={24} strokeWidth={1.5} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{libConfig.name || selectedLibKpi.name}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">fue agregado a tus KPIs correctamente.</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Puedes registrar valores desde la tarjeta del KPI en el dashboard.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-base)] flex justify-between items-center shrink-0">
              {libraryStep === 'browse' && (
                <>
                  <p className="text-xs text-[var(--text-muted)]">{filteredLibrary.length} KPIs disponibles</p>
                  <Dialog.Close className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium">{t('common.close')}</Dialog.Close>
                </>
              )}
              {libraryStep === 'tutorial' && (
                <>
                  <button onClick={() => setLibraryStep('browse')} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium">
                    <ArrowLeft size={14} strokeWidth={1.5} /> Volver
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setLibraryStep('browse')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium">Ahora no</button>
                    <button onClick={goToConfigure} className="flex items-center gap-1.5 bg-[var(--blue)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                      Agregar este KPI <ArrowRight size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              )}
              {libraryStep === 'configure' && (
                <>
                  <button onClick={() => setLibraryStep('tutorial')} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium">
                    <ArrowLeft size={14} strokeWidth={1.5} /> Atras
                  </button>
                  <button
                    onClick={handleLibraryCreate}
                    disabled={libSaving || !libConfig.name}
                    className="flex items-center gap-1.5 bg-[var(--blue)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {libSaving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                    Crear KPI
                  </button>
                </>
              )}
              {libraryStep === 'confirm' && (
                <>
                  <button onClick={() => setLibraryStep('browse')} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium">
                    <BookOpen size={14} strokeWidth={1.5} /> Agregar otro
                  </button>
                  <button onClick={closeLibrary} className="bg-[var(--blue)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    Listo
                  </button>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AgentWidget config={{
        name: 'Agente de Metricas',
        description: 'Te ayudo a definir y trackear los KPIs correctos',
        module: 'kpis',
        suggestions: ['Que KPIs debo trackear para mis clientes?', 'Como defino un buen objetivo de KPI?', 'Como presento los KPIs al cliente?'],
      }} />
    </div>
  )
}
