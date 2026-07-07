'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, X, ChevronDown, ChevronUp, Loader2, TrendingUp, DollarSign, Users, Cpu, Settings, Lightbulb, ArrowRight, AlertTriangle, Clock, CheckCircle2, BookOpen, Pencil, Trash2, Download } from 'lucide-react'
import { downloadCSV } from '@/lib/export'
import { downloadPDF } from '@/lib/pdf'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { InfoBanner } from '@/components/shared/InfoBanner'

interface KeyResult {
  id: string; title: string; description: string; metric_type: string
  start_value: number; target_value: number; current_value: number
  unit: string; due_date: string; status: string
}
interface Objective {
  id: string; title: string; description: string; type: string
  client_id: string | null; quarter: string; year: number; status: string
  owner_id: string; clients: { id: string; name: string } | null
  key_results: KeyResult[]
}
interface Client { id: string; name: string }

interface SuggestedObjective {
  title: string
  why: string
  howToMeasure: string
  timeframe: string
  krs: { title: string; target_value: string; unit: string }[]
  mistakes: string[]
}

interface SuggestedCategory {
  key: string
  label: string
  icon: React.ReactNode
  objectives: SuggestedObjective[]
}

const SUGGESTED_CATEGORIES: SuggestedCategory[] = [
  {
    key: 'crecimiento', label: 'Crecimiento',
    icon: <TrendingUp size={16} strokeWidth={1.5} />,
    objectives: [
      { title: 'Doblar seguidores en Instagram', why: 'Mas seguidores significa mayor alcance organico y mas oportunidades de negocio. Instagram sigue siendo la plataforma clave para agencias de marketing.', howToMeasure: 'Comparar el conteo de seguidores al inicio vs final del periodo. Monitorear engagement rate semanalmente.', timeframe: 'Trimestral', krs: [{ title: 'Publicar 5x/semana', target_value: '5', unit: 'posts/semana' }, { title: 'Alcanzar X seguidores', target_value: '10000', unit: 'seguidores' }, { title: 'Engagement >5%', target_value: '5', unit: '%' }], mistakes: ['Comprar seguidores falsos que destruyen el engagement rate', 'No tener un calendario de contenido consistente'] },
      { title: 'Viralizar contenido en TikTok', why: 'TikTok ofrece el mayor alcance organico de todas las plataformas. Un video viral puede generar mas leads que meses de contenido regular.', howToMeasure: 'Rastrear views por video, CTR hacia el perfil/link, y nuevos seguidores semanales.', timeframe: 'Trimestral', krs: [{ title: '3 videos >100K views', target_value: '3', unit: 'videos' }, { title: 'CTR >3%', target_value: '3', unit: '%' }, { title: '500 nuevos seguidores/semana', target_value: '500', unit: 'seguidores/semana' }], mistakes: ['Copiar trends sin adaptarlos a tu marca', 'No incluir un CTA claro en cada video'] },
      { title: 'Posicionar marca en LinkedIn', why: 'LinkedIn es la plataforma B2B por excelencia. Posicionarte como experto genera confianza y atrae clientes de alto ticket.', howToMeasure: 'Medir crecimiento de conexiones, engagement en articulos, y leads generados desde LinkedIn.', timeframe: 'Semestral', krs: [{ title: '10 articulos publicados', target_value: '10', unit: 'articulos' }, { title: '1000 nuevas conexiones', target_value: '1000', unit: 'conexiones' }, { title: '5 colaboraciones', target_value: '5', unit: 'collabs' }], mistakes: ['Publicar contenido generico sin punto de vista propio', 'No interactuar con los comentarios de tu red'] },
      { title: 'Crecer comunidad en YouTube', why: 'YouTube es el segundo buscador del mundo. El contenido evergreen genera leads pasivos durante meses o anos.', howToMeasure: 'Verificar suscriptores nuevos, horas de reproduccion en YouTube Studio, y CTR de thumbnails.', timeframe: 'Semestral', krs: [{ title: '12 videos/mes', target_value: '12', unit: 'videos' }, { title: '1000 suscriptores', target_value: '1000', unit: 'suscriptores' }, { title: '4000 horas de reproduccion', target_value: '4000', unit: 'horas' }], mistakes: ['Priorizar cantidad sobre calidad de produccion', 'No optimizar titulos y thumbnails para CTR'] },
      { title: 'Aumentar alcance organico 50%', why: 'Depender de ads es costoso. Un buen alcance organico reduce el costo de adquisicion y construye marca a largo plazo.', howToMeasure: 'Comparar impresiones organicas promedio por post antes y despues del periodo.', timeframe: 'Trimestral', krs: [{ title: 'Mejorar horarios de publicacion', target_value: '1', unit: 'analisis' }, { title: 'Usar mas Reels', target_value: '20', unit: 'reels/mes' }, { title: 'Colabs con 3 cuentas', target_value: '3', unit: 'collabs' }], mistakes: ['No analizar los insights para optimizar horarios', 'Publicar siempre el mismo formato de contenido'] },
      { title: 'Lanzar estrategia de contenido', why: 'Sin estrategia, el contenido es ruido. Un plan claro alinea cada pieza con objetivos de negocio y ahorra tiempo.', howToMeasure: 'Tener calendario editorial activo, pilares definidos, y batch de contenido producido.', timeframe: 'Trimestral', krs: [{ title: 'Crear calendario editorial', target_value: '1', unit: 'calendario' }, { title: 'Definir pilares de contenido', target_value: '4', unit: 'pilares' }, { title: 'Batch 30 dias', target_value: '30', unit: 'dias' }], mistakes: ['Crear pilares demasiado amplios sin diferenciacion', 'No revisar ni ajustar el calendario cada mes'] },
      { title: 'Mejorar engagement rate', why: 'El engagement es la metrica que los algoritmos priorizan. Mejor engagement = mas alcance = mas oportunidades.', howToMeasure: 'Calcular (likes + comentarios + shares + saves) / alcance * 100 semanalmente.', timeframe: 'Trimestral', krs: [{ title: 'Responder comentarios en <1h', target_value: '1', unit: 'hora max' }, { title: '3 CTAs por semana', target_value: '3', unit: 'CTAs/semana' }, { title: 'Stories diarias', target_value: '7', unit: 'stories/semana' }], mistakes: ['Ignorar los comentarios y mensajes directos', 'Usar CTAs genericos que no generan accion'] },
      { title: 'Construir comunidad activa', why: 'Una comunidad leal compra mas, refiere mas, y defiende tu marca. Es el activo mas valioso a largo plazo.', howToMeasure: 'Medir miembros activos en el grupo, asistencia a eventos, y tasa de participacion.', timeframe: 'Semestral', krs: [{ title: 'Grupo de WhatsApp/Telegram', target_value: '1', unit: 'grupo' }, { title: '50 miembros activos', target_value: '50', unit: 'miembros' }, { title: 'Evento mensual', target_value: '1', unit: 'evento/mes' }], mistakes: ['Crear el grupo y no moderar ni aportar valor', 'No tener reglas claras de convivencia'] },
    ],
  },
  {
    key: 'finanzas', label: 'Finanzas',
    icon: <DollarSign size={16} strokeWidth={1.5} />,
    objectives: [
      { title: 'Aumentar facturacion 30%', why: 'El crecimiento sostenido de ingresos es vital para escalar. Un 30% es ambicioso pero alcanzable con estrategia.', howToMeasure: 'Comparar facturacion total del periodo actual vs anterior. Desglosar por fuente de ingreso.', timeframe: 'Semestral', krs: [{ title: '2 nuevos clientes/mes', target_value: '2', unit: 'clientes/mes' }, { title: 'Subir precios 15%', target_value: '15', unit: '%' }, { title: 'Crear servicio premium', target_value: '1', unit: 'servicio' }], mistakes: ['Subir precios sin mejorar el valor entregado', 'Perseguir clientes que no son ideales solo por facturar'] },
      { title: 'Reducir costos operativos', why: 'Cada peso ahorrado es un peso de ganancia. Optimizar costos sin perder calidad mejora los margenes directamente.', howToMeasure: 'Auditar gastos mensuales y comparar con el baseline. Medir tiempo ahorrado en procesos automatizados.', timeframe: 'Trimestral', krs: [{ title: 'Auditar suscripciones', target_value: '1', unit: 'auditoria' }, { title: 'Automatizar 3 procesos', target_value: '3', unit: 'procesos' }, { title: 'Reducir gastos 20%', target_value: '20', unit: '%' }], mistakes: ['Recortar gastos que afectan la calidad del servicio', 'No considerar el costo de oportunidad del tiempo'] },
      { title: 'Alcanzar punto de equilibrio', why: 'El break-even es el primer hito financiero critico. Hasta que no lo alcanzas, el negocio no es sostenible.', howToMeasure: 'Calcular costos fijos + variables mensuales y comparar con ingresos. El break-even es cuando ingresos >= costos.', timeframe: 'Trimestral', krs: [{ title: 'Calcular break-even', target_value: '1', unit: 'calculo' }, { title: 'Cubrir gastos fijos', target_value: '100', unit: '%' }, { title: 'Margen >30%', target_value: '30', unit: '%' }], mistakes: ['No incluir tu propio sueldo en los costos fijos', 'Subestimar gastos variables e imprevistos'] },
      { title: 'Diversificar ingresos', why: 'Depender de un solo tipo de ingreso es riesgoso. La diversificacion protege contra la perdida de clientes.', howToMeasure: 'Mapear fuentes de ingreso y su porcentaje del total. Ninguna deberia superar el 40%.', timeframe: 'Semestral', krs: [{ title: 'Crear producto digital', target_value: '1', unit: 'producto' }, { title: 'Servicio recurrente', target_value: '1', unit: 'servicio' }, { title: 'Afiliados/comisiones', target_value: '1', unit: 'programa' }], mistakes: ['Lanzar demasiados productos a la vez sin validar', 'Descuidar el servicio principal por experimentar'] },
      { title: 'Mejorar flujo de caja', why: 'El flujo de caja es el oxigeno del negocio. Puedes ser rentable y quebrar si no gestionas bien el cash flow.', howToMeasure: 'Monitorear dias de cobro promedio, saldo disponible, y proyeccion de flujo a 30 dias.', timeframe: 'Trimestral', krs: [{ title: 'Cobrar 50% por adelantado', target_value: '50', unit: '%' }, { title: 'Reducir dias de cobro a 15', target_value: '15', unit: 'dias' }, { title: 'Fondo de emergencia', target_value: '3', unit: 'meses' }], mistakes: ['No tener politica de cobro clara desde el inicio', 'No hacer seguimiento a las facturas vencidas'] },
      { title: 'Escalar a 6 cifras', why: 'Alcanzar $10K MRR es el punto donde puedes contratar, invertir, y dejar de ser freelancer para ser agencia.', howToMeasure: 'Rastrear MRR (Monthly Recurring Revenue), numero de clientes recurrentes, y costo de equipo.', timeframe: 'Anual', krs: [{ title: '$10K MRR', target_value: '10000', unit: 'USD/mes' }, { title: '10 clientes recurrentes', target_value: '10', unit: 'clientes' }, { title: 'Contratar 1 empleado', target_value: '1', unit: 'empleado' }], mistakes: ['Escalar ingresos sin escalar la capacidad operativa', 'No calcular el costo real de un empleado (sueldo + impuestos + herramientas)'] },
      { title: 'Crear presupuesto anual', why: 'Sin presupuesto, gastas reactivamente. Un presupuesto te da control y te permite tomar decisiones informadas.', howToMeasure: 'Tener documento de proyeccion 12 meses, revisiones mensuales documentadas, y ahorro cumplido.', timeframe: 'Anual', krs: [{ title: 'Proyeccion 12 meses', target_value: '12', unit: 'meses' }, { title: 'Revision mensual', target_value: '12', unit: 'revisiones' }, { title: 'Ahorro del 10%', target_value: '10', unit: '%' }], mistakes: ['Hacer el presupuesto y nunca revisarlo', 'No incluir un porcentaje para imprevistos'] },
      { title: 'Mejorar rentabilidad por cliente', why: 'No todos los clientes son iguales. Optimizar la rentabilidad por cliente te permite crecer de forma sostenible.', howToMeasure: 'Calcular ingreso - costo (incluido tiempo) por cliente. Identificar los que estan debajo del margen minimo.', timeframe: 'Trimestral', krs: [{ title: 'Auditar tiempo por cliente', target_value: '1', unit: 'auditoria' }, { title: 'Eliminar clientes no rentables', target_value: '1', unit: 'accion' }, { title: 'Upsell', target_value: '3', unit: 'clientes' }], mistakes: ['No trackear las horas reales dedicadas a cada cliente', 'Tener miedo de soltar clientes que no son rentables'] },
    ],
  },
  {
    key: 'clientes', label: 'Clientes',
    icon: <Users size={16} strokeWidth={1.5} />,
    objectives: [
      { title: 'Retener el 90% de clientes', why: 'Adquirir un cliente nuevo cuesta 5-7x mas que retener uno existente. La retencion es la base de un negocio sostenible.', howToMeasure: 'Calcular (clientes al final - nuevos) / clientes al inicio * 100. Complementar con NPS.', timeframe: 'Trimestral', krs: [{ title: 'NPS >8', target_value: '8', unit: 'puntos' }, { title: 'Check-in mensual', target_value: '1', unit: '/mes' }, { title: 'Entrega en fecha siempre', target_value: '100', unit: '%' }], mistakes: ['Asumir que el cliente esta contento sin preguntarle', 'Solo contactar al cliente cuando hay problemas'] },
      { title: 'Conseguir 5 clientes nuevos', why: 'El crecimiento requiere un pipeline activo de prospectos. 5 clientes nuevos puede representar un salto significativo en ingresos.', howToMeasure: 'Rastrear propuestas enviadas, tasa de conversion, y fuente de cada nuevo cliente.', timeframe: 'Trimestral', krs: [{ title: '20 propuestas enviadas', target_value: '20', unit: 'propuestas' }, { title: '3 referidos', target_value: '3', unit: 'referidos' }, { title: '1 alianza estrategica', target_value: '1', unit: 'alianza' }], mistakes: ['Enviar propuestas genericas sin personalizar', 'No hacer seguimiento despues de enviar la propuesta'] },
      { title: 'Mejorar satisfaccion del cliente', why: 'Clientes satisfechos renuevan, refieren, y pagan mas. La satisfaccion es el predictor numero uno de retencion.', howToMeasure: 'Enviar encuesta de satisfaccion mensual, medir tiempo de respuesta, y rastrear quejas.', timeframe: 'Trimestral', krs: [{ title: 'Encuesta mensual', target_value: '1', unit: '/mes' }, { title: 'Respuesta <24h', target_value: '24', unit: 'horas max' }, { title: '0 quejas sin resolver', target_value: '0', unit: 'quejas' }], mistakes: ['No actuar sobre el feedback recibido', 'Medir satisfaccion pero no comunicar las mejoras implementadas'] },
      { title: 'Crear programa de referidos', why: 'Los referidos son el canal de adquisicion con mejor tasa de conversion y menor costo. Un programa formal lo sistematiza.', howToMeasure: 'Contar referidos activos, conversiones generadas, y costo por adquisicion del canal.', timeframe: 'Trimestral', krs: [{ title: 'Disenar incentivo', target_value: '1', unit: 'programa' }, { title: '10 referidos activos', target_value: '10', unit: 'referidos' }, { title: '3 conversiones', target_value: '3', unit: 'clientes' }], mistakes: ['Ofrecer incentivos que no motivan realmente', 'No recordarle al cliente que el programa existe'] },
      { title: 'Onboarding en menos de 7 dias', why: 'Un onboarding rapido genera confianza y reduce la probabilidad de cancelacion temprana. La primera impresion cuenta.', howToMeasure: 'Medir dias desde firma de contrato hasta primera entrega. Encuestar experiencia de onboarding.', timeframe: 'Trimestral', krs: [{ title: 'Checklist de onboarding', target_value: '1', unit: 'checklist' }, { title: 'Reunion de kickoff', target_value: '1', unit: 'por cliente' }, { title: 'Accesos en 24h', target_value: '24', unit: 'horas' }], mistakes: ['No tener un proceso estandarizado de onboarding', 'Pedir toda la informacion al cliente de una sola vez'] },
      { title: 'Aumentar ticket promedio', why: 'Venderle mas a un cliente existente es mas facil que conseguir uno nuevo. El upsell aumenta el LTV sin aumentar el CAC.', howToMeasure: 'Comparar ticket promedio antes y despues. Rastrear servicios adicionales vendidos.', timeframe: 'Semestral', krs: [{ title: 'Crear paquetes premium', target_value: '2', unit: 'paquetes' }, { title: 'Upsell a 3 clientes', target_value: '3', unit: 'clientes' }, { title: 'Servicios adicionales', target_value: '3', unit: 'servicios' }], mistakes: ['Ofrecer upsell sin que el servicio base este bien resuelto', 'No personalizar la oferta segun las necesidades del cliente'] },
      { title: 'Fidelizar clientes con reportes', why: 'Los reportes demuestran el valor de tu trabajo. Un cliente que ve resultados claros renueva sin dudarlo.', howToMeasure: 'Verificar que cada cliente reciba su reporte semanal, tenga acceso al dashboard, y asista a la reunion mensual.', timeframe: 'Trimestral', krs: [{ title: 'Reporte semanal', target_value: '4', unit: '/mes' }, { title: 'Dashboard de metricas', target_value: '1', unit: 'por cliente' }, { title: 'Reunion mensual', target_value: '1', unit: '/mes' }], mistakes: ['Enviar reportes sin contexto ni recomendaciones', 'No adaptar las metricas a lo que le importa al cliente'] },
      { title: 'Expandir a nuevos mercados', why: 'Nuevos mercados significan nuevas oportunidades. La diversificacion geografica reduce el riesgo de depender de un solo mercado.', howToMeasure: 'Rastrear paises investigados, contactos generados, y clientes cerrados en nuevos mercados.', timeframe: 'Anual', krs: [{ title: 'Investigar 2 paises', target_value: '2', unit: 'paises' }, { title: '5 contactos locales', target_value: '5', unit: 'contactos' }, { title: '1 cliente internacional', target_value: '1', unit: 'cliente' }], mistakes: ['No adaptar la comunicacion al idioma y cultura local', 'Subestimar las diferencias legales y fiscales'] },
    ],
  },
  {
    key: 'equipo', label: 'Equipo',
    icon: <Settings size={16} strokeWidth={1.5} />,
    objectives: [
      { title: 'Contratar primer empleado', why: 'Pasar de freelancer a tener equipo es el salto mas importante. Te permite delegar y enfocarte en crecer el negocio.', howToMeasure: 'Tener el rol definido, proceso de seleccion completado, y empleado productivo en 30 dias.', timeframe: 'Trimestral', krs: [{ title: 'Definir rol', target_value: '1', unit: 'descripcion' }, { title: 'Proceso de seleccion', target_value: '1', unit: 'proceso' }, { title: 'Onboarding en 30 dias', target_value: '30', unit: 'dias' }], mistakes: ['Contratar demasiado rapido sin definir bien el rol', 'No tener presupuesto para al menos 3 meses de sueldo'] },
      { title: 'Implementar SOPs del equipo', why: 'Los SOPs (Standard Operating Procedures) aseguran calidad consistente y permiten escalar sin depender de una sola persona.', howToMeasure: 'Contar procesos documentados, verificar que el equipo los use, y auditar mensualmente.', timeframe: 'Trimestral', krs: [{ title: '10 procesos documentados', target_value: '10', unit: 'SOPs' }, { title: 'Capacitacion', target_value: '1', unit: 'sesion' }, { title: 'Auditoria mensual', target_value: '1', unit: '/mes' }], mistakes: ['Documentar procesos que nadie sigue', 'Hacer SOPs demasiado largos y complicados'] },
      { title: 'Mejorar productividad 20%', why: 'Mas productividad = mas output con el mismo equipo = mejores margenes. Es la forma mas directa de crecer sin contratar.', howToMeasure: 'Medir output por persona (piezas/hora, tareas completadas) y comparar con el baseline.', timeframe: 'Trimestral', krs: [{ title: 'Reuniones max 30 min', target_value: '30', unit: 'min' }, { title: 'Usar gestion de tareas', target_value: '1', unit: 'herramienta' }, { title: 'Sin interrupciones 2h/dia', target_value: '2', unit: 'h/dia' }], mistakes: ['Medir productividad por horas trabajadas en vez de output', 'Implementar demasiadas herramientas a la vez'] },
      { title: 'Capacitar equipo en IA', why: 'La IA multiplica la capacidad del equipo. Los que adopten IA primero tendran una ventaja competitiva enorme.', howToMeasure: 'Verificar cursos completados, herramientas adoptadas, y tiempo ahorrado semanalmente.', timeframe: 'Trimestral', krs: [{ title: '1 curso por persona', target_value: '1', unit: 'curso' }, { title: '5 herramientas IA adoptadas', target_value: '5', unit: 'herramientas' }, { title: 'Ahorro 10h/semana', target_value: '10', unit: 'h/semana' }], mistakes: ['Forzar herramientas sin explicar el beneficio', 'No medir el impacto real del uso de IA'] },
      { title: 'Crear cultura de feedback', why: 'El feedback constante mejora el desempeno, la satisfaccion, y la retencion del equipo. Sin feedback, los problemas crecen en silencio.', howToMeasure: 'Verificar que se realicen 1-on-1s, evaluaciones trimestrales, y que el buzon de sugerencias este activo.', timeframe: 'Trimestral', krs: [{ title: '1-on-1 mensual', target_value: '1', unit: '/mes' }, { title: 'Evaluacion trimestral', target_value: '1', unit: '/trimestre' }, { title: 'Buzon de sugerencias', target_value: '1', unit: 'activo' }], mistakes: ['Dar feedback solo negativo', 'No dar seguimiento a las sugerencias recibidas'] },
      { title: 'Reducir rotacion de equipo', why: 'Perder un empleado cuesta entre 50-200% de su sueldo anual en reclutamiento, capacitacion, y productividad perdida.', howToMeasure: 'Calcular tasa de rotacion (salidas / equipo promedio * 100). Complementar con encuesta de clima.', timeframe: 'Semestral', krs: [{ title: 'Encuesta de clima', target_value: '1', unit: 'encuesta' }, { title: 'Beneficios adicionales', target_value: '2', unit: 'beneficios' }, { title: 'Plan de carrera', target_value: '1', unit: 'por persona' }], mistakes: ['Esperar a que alguien renuncie para actuar', 'Ofrecer beneficios que el equipo no valora'] },
      { title: 'Delegar operaciones clave', why: 'Si todo depende de ti, el negocio no escala. Delegar libera tu tiempo para estrategia y crecimiento.', howToMeasure: 'Contar procesos delegados con responsable asignado y verificar que funcionen sin tu intervencion.', timeframe: 'Trimestral', krs: [{ title: 'Documentar 5 procesos', target_value: '5', unit: 'procesos' }, { title: 'Asignar responsables', target_value: '5', unit: 'personas' }, { title: 'Check semanal', target_value: '1', unit: '/semana' }], mistakes: ['Delegar sin dar contexto ni autoridad para decidir', 'Micromanagear despues de delegar'] },
      { title: 'Team retreat anual', why: 'Un retreat fortalece los lazos del equipo, alinea la vision, y recarga la energia. Es una inversion en cultura.', howToMeasure: 'Confirmar que el presupuesto este definido, la actividad realizada, y los objetivos comunicados.', timeframe: 'Anual', krs: [{ title: 'Presupuesto definido', target_value: '1', unit: 'presupuesto' }, { title: 'Actividad de team building', target_value: '1', unit: 'actividad' }, { title: 'Objetivos del ano', target_value: '1', unit: 'presentacion' }], mistakes: ['Convertir el retreat en una jornada de trabajo disfrazada', 'No pedir feedback del equipo sobre el formato'] },
    ],
  },
  {
    key: 'ia', label: 'IA',
    icon: <Cpu size={16} strokeWidth={1.5} />,
    objectives: [
      { title: 'Automatizar reportes mensuales', why: 'Los reportes son necesarios pero repetitivos. Automatizarlos con IA libera horas de trabajo de alto valor.', howToMeasure: 'Medir tiempo de generacion del reporte y cantidad de correcciones manuales necesarias.', timeframe: 'Trimestral', krs: [{ title: 'Template con IA', target_value: '1', unit: 'template' }, { title: 'Generacion en <30 min', target_value: '30', unit: 'min' }, { title: '0 correcciones manuales', target_value: '0', unit: 'correcciones' }], mistakes: ['No revisar los reportes generados por IA antes de enviarlos', 'Usar prompts genericos que producen contenido generico'] },
      { title: 'Implementar IA en contenido', why: 'La IA puede asistir en ideacion, redaccion y adaptacion de contenido, multiplicando la capacidad creativa del equipo.', howToMeasure: 'Rastrear porcentaje de contenido asistido, tiempo de produccion, y comparar calidad con metricas.', timeframe: 'Trimestral', krs: [{ title: '50% contenido asistido por IA', target_value: '50', unit: '%' }, { title: 'Reducir tiempo 40%', target_value: '40', unit: '%' }, { title: 'Calidad igual', target_value: '100', unit: '%' }], mistakes: ['Publicar contenido de IA sin edicion ni personalizacion', 'No mantener la voz de marca en el contenido asistido'] },
      { title: 'Crear flujos de automatizacion', why: 'Las automatizaciones eliminan tareas manuales repetitivas y reducen errores humanos. Cada flujo es tiempo recuperado.', howToMeasure: 'Contar workflows activos, medir horas ahorradas por semana, y rastrear errores manuales eliminados.', timeframe: 'Trimestral', krs: [{ title: '5 Zaps/workflows activos', target_value: '5', unit: 'workflows' }, { title: 'Ahorrar 10h/semana', target_value: '10', unit: 'h/semana' }, { title: '0 errores manuales', target_value: '0', unit: 'errores' }], mistakes: ['Automatizar procesos que primero necesitan ser simplificados', 'No documentar los flujos para que otros los entiendan'] },
      { title: 'Adoptar IA en atencion al cliente', why: 'Un chatbot bien configurado puede resolver el 60-80% de las consultas frecuentes, liberando tiempo para temas complejos.', howToMeasure: 'Medir porcentaje de consultas resueltas por el bot, tiempo de respuesta, y impacto en NPS.', timeframe: 'Semestral', krs: [{ title: 'Chatbot basico', target_value: '1', unit: 'chatbot' }, { title: 'Respuesta automatica FAQs', target_value: '20', unit: 'FAQs' }, { title: 'NPS sin bajar', target_value: '0', unit: 'caida' }], mistakes: ['No tener opcion de escalar a un humano facilmente', 'Entrenar el chatbot con informacion desactualizada'] },
      { title: 'Optimizar produccion con IA', why: 'La IA puede asistir en guiones, edicion y diseno, reduciendo significativamente los tiempos de produccion.', howToMeasure: 'Comparar tiempo de produccion antes y despues. Medir calidad con metricas de engagement.', timeframe: 'Trimestral', krs: [{ title: 'Guiones con IA', target_value: '10', unit: 'guiones/mes' }, { title: 'Edicion asistida', target_value: '50', unit: '%' }, { title: 'Thumbnails con IA', target_value: '100', unit: '%' }], mistakes: ['Depender 100% de la IA sin supervision creativa', 'No entrenar a la IA con el estilo visual de la marca'] },
      { title: 'Medir ROI de herramientas IA', why: 'Invertir en IA sin medir resultados es como invertir en ads sin rastrear conversiones. Necesitas saber que funciona.', howToMeasure: 'Calcular tiempo ahorrado * costo/hora vs costo de la herramienta. Presentar informe trimestral.', timeframe: 'Trimestral', krs: [{ title: 'Calcular tiempo ahorrado', target_value: '1', unit: 'reporte' }, { title: 'Costo vs beneficio', target_value: '1', unit: 'analisis' }, { title: 'Informe trimestral', target_value: '1', unit: 'informe' }], mistakes: ['Solo medir el costo sin considerar el valor del tiempo ahorrado', 'No cancelar herramientas que no estan dando ROI'] },
      { title: 'Entrenar equipo en prompting', why: 'La calidad del output de IA depende del input. Un equipo que sabe hacer buenos prompts saca 10x mas valor de la IA.', howToMeasure: 'Verificar workshops realizados, biblioteca de prompts creada, y evaluaciones completadas.', timeframe: 'Trimestral', krs: [{ title: 'Workshop mensual', target_value: '1', unit: '/mes' }, { title: 'Biblioteca de prompts', target_value: '50', unit: 'prompts' }, { title: 'Evaluacion practica', target_value: '1', unit: 'evaluacion' }], mistakes: ['Dar teoria sin practica real con casos del dia a dia', 'No actualizar la biblioteca de prompts regularmente'] },
      { title: 'Crear agente IA personalizado', why: 'Un agente IA propio puede automatizar tareas especificas de tu negocio que ninguna herramienta generica resuelve.', howToMeasure: 'Tener el agente implementado, casos de uso definidos, y metricas de efectividad medidas.', timeframe: 'Semestral', krs: [{ title: 'Definir casos de uso', target_value: '3', unit: 'casos' }, { title: 'Implementar con API', target_value: '1', unit: 'agente' }, { title: 'Medir efectividad', target_value: '1', unit: 'reporte' }], mistakes: ['Intentar resolver demasiados casos de uso con un solo agente', 'No definir metricas de exito antes de implementar'] },
    ],
  },
  {
    key: 'personalizado', label: 'Personalizado',
    icon: <Lightbulb size={16} strokeWidth={1.5} />,
    objectives: [],
  },
]

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function getCurrentQuarter() {
  const m = new Date().getMonth()
  if (m < 3) return 'Q1'
  if (m < 6) return 'Q2'
  if (m < 9) return 'Q3'
  return 'Q4'
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [quarter, setQuarter] = useState(getCurrentQuarter())
  const [year, setYear] = useState(new Date().getFullYear())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('agency')
  const [formClientId, setFormClientId] = useState('')
  const [pendingKRs, setPendingKRs] = useState<{title: string; target_value: string; unit: string}[]>([])
  const [showKRForm, setShowKRForm] = useState<string | null>(null)
  const [showUpdateKR, setShowUpdateKR] = useState<string | null>(null)
  const [krValue, setKRValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggestedTab, setSuggestedTab] = useState('crecimiento')
  const [guideObj, setGuideObj] = useState<SuggestedObjective | null>(null)
  const [guideKRs, setGuideKRs] = useState<{ title: string; target_value: string; unit: string }[]>([])
  const [creatingFromGuide, setCreatingFromGuide] = useState(false)

  // Edit / Delete state
  const [editObj, setEditObj] = useState<Objective | null>(null)
  const [editObjData, setEditObjData] = useState({ title: '', description: '', quarter: '', year: 0, client_id: '' })
  const [editObjSaving, setEditObjSaving] = useState(false)
  const [deleteObjId, setDeleteObjId] = useState<string | null>(null)
  const [deletingObj, setDeletingObj] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [oRes, cRes] = await Promise.all([
      fetch(`/api/objectives?quarter=${quarter}&year=${year}`),
      fetch('/api/clients'),
    ])
    if (oRes.ok) { const j = await oRes.json(); setObjectives(j.data || []) }
    if (cRes.ok) { const j = await cRes.json(); setClients(j.data || []) }
    setLoading(false)
  }, [quarter, year])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreateObj(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formTitle, description: formDesc,
        type: formType, client_id: formClientId || undefined,
        quarter, year,
      }),
    })
    if (res.ok && pendingKRs.length > 0) {
      const obj = await res.json()
      const objId = obj.data?.id
      if (objId) {
        for (const kr of pendingKRs) {
          await fetch(`/api/objectives/${objId}/key-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: kr.title, target_value: parseFloat(kr.target_value) || 0, unit: kr.unit, metric_type: 'number' }),
          })
        }
      }
    }
    setSaving(false); setShowForm(false); setShowTemplates(false); fetchData()
  }

  async function handleCreateKR(e: React.FormEvent<HTMLFormElement>, objId: string) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    await fetch(`/api/objectives/${objId}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'), metric_type: fd.get('metric_type'),
        start_value: parseFloat(fd.get('start_value') as string) || 0,
        target_value: parseFloat(fd.get('target_value') as string),
        unit: fd.get('unit'), due_date: fd.get('due_date') || undefined,
      }),
    })
    setSaving(false); setShowKRForm(null); fetchData()
  }

  async function handleUpdateKR(krId: string, objId: string) {
    if (!krValue) return
    setSaving(true)
    await fetch(`/api/objectives/${objId}/key-results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kr_id: krId, current_value: parseFloat(krValue) }),
    })
    setSaving(false); setShowUpdateKR(null); setKRValue(''); fetchData()
  }

  function getObjProgress(obj: Objective) {
    const krs = obj.key_results || []
    if (krs.length === 0) return 0
    const avg = krs.reduce((sum, kr) => {
      const range = Number(kr.target_value) - Number(kr.start_value)
      if (range === 0) return sum
      return sum + Math.min(100, ((Number(kr.current_value) - Number(kr.start_value)) / range) * 100)
    }, 0) / krs.length
    return Math.round(avg)
  }

  function openGuide(obj: SuggestedObjective) {
    setGuideObj(obj)
    setGuideKRs(obj.krs.map(kr => ({ ...kr })))
  }

  function showNextGuide() {
    if (!guideObj) return
    const cat = SUGGESTED_CATEGORIES.find(c => c.key === suggestedTab)
    if (!cat) return
    const idx = cat.objectives.findIndex(o => o.title === guideObj.title)
    const next = cat.objectives[(idx + 1) % cat.objectives.length]
    openGuide(next)
  }

  async function createFromGuide() {
    if (!guideObj) return
    setCreatingFromGuide(true)
    const res = await fetch('/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: guideObj.title,
        description: guideObj.why,
        type: 'agency',
        quarter,
        year,
      }),
    })
    if (res.ok) {
      const obj = await res.json()
      const objId = obj.data?.id
      if (objId) {
        for (const kr of guideKRs) {
          await fetch(`/api/objectives/${objId}/key-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: kr.title, target_value: parseFloat(kr.target_value) || 0, unit: kr.unit, metric_type: 'number' }),
          })
        }
      }
    }
    setCreatingFromGuide(false)
    setGuideObj(null)
    fetchData()
  }

  function getKRProgress(kr: KeyResult) {
    const range = Number(kr.target_value) - Number(kr.start_value)
    if (range === 0) return 0
    return Math.min(100, Math.round(((Number(kr.current_value) - Number(kr.start_value)) / range) * 100))
  }

  function openEditObj(obj: Objective) {
    setEditObj(obj)
    setEditObjData({
      title: obj.title,
      description: obj.description || '',
      quarter: obj.quarter,
      year: obj.year,
      client_id: obj.client_id || '',
    })
  }

  async function handleEditObj() {
    if (!editObj) return
    setEditObjSaving(true)
    try {
      const res = await fetch(`/api/objectives/${editObj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editObjData.title,
          description: editObjData.description,
          quarter: editObjData.quarter,
          year: editObjData.year,
          client_id: editObjData.client_id || null,
        }),
      })
      if (res.ok) {
        setEditObj(null)
        fetchData()
      }
    } finally {
      setEditObjSaving(false)
    }
  }

  async function handleDeleteObj() {
    if (!deleteObjId) return
    setDeletingObj(true)
    try {
      const res = await fetch(`/api/objectives/${deleteObjId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteObjId(null)
        fetchData()
      }
    } finally {
      setDeletingObj(false)
    }
  }

  return (
    <div className="space-y-6">
      <InfoBanner id="objectives" title="Objetivos y OKRs" description="Establece objetivos trimestrales con key results medibles para tu agencia y clientes." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Objetivos y OKRs</h1>
          <p className="mt-1 text-sm text-slate-500">Seguimiento de objetivos por trimestre</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => setQuarter(q)} className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                quarter === q ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              )}>{q}</button>
            ))}
          </div>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {[new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => {
              const exportData = objectives.map(obj => ({
                titulo: obj.title,
                tipo: obj.type === 'agency' ? 'Agencia' : 'Cliente',
                cliente: obj.clients?.name || 'Sin cliente',
                trimestre: `${obj.quarter} ${obj.year}`,
                key_results: (obj.key_results || []).length,
                progreso: `${getObjProgress(obj)}%`,
                estado: obj.status,
              }))
              downloadCSV(exportData as Record<string, unknown>[], `objetivos-${quarter}-${year}`, [
                { key: 'titulo', label: 'Titulo' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'trimestre', label: 'Trimestre' },
                { key: 'key_results', label: 'Key Results' },
                { key: 'progreso', label: 'Progreso' },
                { key: 'estado', label: 'Estado' },
              ])
            }}
            disabled={objectives.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} strokeWidth={1.5} /> CSV
          </button>
          <button
            onClick={() => {
              const exportData = objectives.map(obj => ({
                titulo: obj.title,
                tipo: obj.type === 'agency' ? 'Agencia' : 'Cliente',
                cliente: obj.clients?.name || 'Sin cliente',
                key_results: (obj.key_results || []).length,
                progreso: `${getObjProgress(obj)}%`,
                estado: obj.status,
              }))
              downloadPDF({
                title: 'Objetivos y OKRs',
                subtitle: `${quarter} ${year}`,
                filename: `objetivos-${quarter}-${year}`,
                columns: [
                  { key: 'titulo', label: 'Titulo' },
                  { key: 'tipo', label: 'Tipo' },
                  { key: 'cliente', label: 'Cliente' },
                  { key: 'key_results', label: 'Key Results' },
                  { key: 'progreso', label: 'Progreso' },
                  { key: 'estado', label: 'Estado' },
                ],
                data: exportData as Record<string, unknown>[],
              })
            }}
            disabled={objectives.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} strokeWidth={1.5} /> PDF
          </button>
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nuevo objetivo
          </button>
        </div>
      </div>

      {showTemplates && !showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Objetivos sugeridos</h3>
            <button onClick={() => setShowTemplates(false)}><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <p className="text-sm text-slate-500">Elegi un template o crea un objetivo personalizado</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: '🚀', title: 'Crecer la comunidad', krs: [{title:'Alcanzar X seguidores',target_value:'1000',unit:'seguidores'},{title:'Publicar X veces/semana',target_value:'5',unit:'posts'},{title:'Lograr X% engagement',target_value:'5',unit:'%'}] },
              { icon: '📈', title: 'Aumentar ventas con contenido', krs: [{title:'Generar X leads',target_value:'100',unit:'leads'},{title:'Lograr X conversiones',target_value:'50',unit:'ventas'},{title:'Alcanzar X ROAS',target_value:'3',unit:'x'}] },
              { icon: '🎯', title: 'Posicionar la marca', krs: [{title:'Lograr X menciones',target_value:'20',unit:'menciones'},{title:'X colaboraciones',target_value:'5',unit:'collabs'},{title:'X apariciones en medios',target_value:'3',unit:'medios'}] },
              { icon: '⚡', title: 'Optimizar la produccion', krs: [{title:'Reducir tiempo de produccion a X dias',target_value:'3',unit:'dias'},{title:'Crear X piezas/mes',target_value:'20',unit:'piezas'},{title:'Aprobar en primera revision X%',target_value:'80',unit:'%'}] },
            ].map((t, i) => (
              <button key={i} onClick={() => { setFormTitle(t.title); setFormDesc(''); setPendingKRs(t.krs); setShowForm(true) }} className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                <span className="text-2xl">{t.icon}</span>
                <p className="text-sm font-semibold text-slate-900 mt-2">{t.title}</p>
                <p className="text-xs text-slate-400 mt-1">{t.krs.length} key results</p>
              </button>
            ))}
            <button onClick={() => { setFormTitle(''); setFormDesc(''); setPendingKRs([]); setShowForm(true) }} className="text-left p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
              <span className="text-2xl">✏️</span>
              <p className="text-sm font-semibold text-slate-900 mt-2">Personalizado</p>
              <p className="text-xs text-slate-400 mt-1">Sin KRs pre-cargados</p>
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateObj} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Nuevo objetivo — {quarter} {year}</h3>
            <button type="button" onClick={() => { setShowForm(false); setShowTemplates(false) }}><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block font-medium">Titulo *</label><input value={formTitle} onChange={e => setFormTitle(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Tipo</label><select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="agency">Agencia</option><option value="client">Cliente</option></select></div>
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label><select value={formClientId} onChange={e => setFormClientId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Descripcion</label><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-20 resize-none" /></div>
          {pendingKRs.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Key Results pre-cargados (editables)</p>
              {pendingKRs.map((kr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={kr.title} onChange={e => { const n = [...pendingKRs]; n[i].title = e.target.value; setPendingKRs(n) }} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input type="number" value={kr.target_value} onChange={e => { const n = [...pendingKRs]; n[i].target_value = e.target.value; setPendingKRs(n) }} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                  <span className="text-xs text-slate-400 w-16">{kr.unit}</span>
                  <button type="button" onClick={() => setPendingKRs(pendingKRs.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-slate-400" /></button>
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">Crear objetivo</button>
        </form>
      )}

      {/* Suggested Objectives Section */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-[var(--bg-base)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-base)]">
          <div className="flex items-center gap-2">
            <BookOpen size={16} strokeWidth={1.5} className="text-[var(--blue)]" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Objetivos sugeridos</h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Selecciona un objetivo para ver la guia completa con key results recomendados</p>
        </div>
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 border-b border-[var(--border-base)]">
            {SUGGESTED_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSuggestedTab(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
                  suggestedTab === cat.key
                    ? 'border-[var(--blue)] text-[var(--blue)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {suggestedTab === 'personalizado' ? (
            <div className="text-center py-8">
              <Lightbulb size={16} strokeWidth={1.5} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Usa el boton "Nuevo objetivo" para crear uno personalizado con tus propios key results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SUGGESTED_CATEGORIES.find(c => c.key === suggestedTab)?.objectives.map((obj, i) => (
                <button
                  key={i}
                  onClick={() => openGuide(obj)}
                  className="text-left p-4 rounded-[var(--radius-md)] border border-[var(--border-base)] hover:border-[var(--blue)] hover:shadow-[var(--shadow-sm)] transition-all group"
                >
                  <p className="text-sm font-medium group-hover:text-[var(--blue)] transition-colors" style={{ color: 'var(--text-primary)' }}>{obj.title}</p>
                  <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{obj.why.slice(0, 80)}...</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-[var(--border-base)]" style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)' }}>{obj.krs.length} KRs</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-[var(--border-base)]" style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)' }}>{obj.timeframe}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guide Modal */}
      <Dialog.Root open={!!guideObj} onOpenChange={open => { if (!open) setGuideObj(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-[var(--bg-base)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {guideObj && (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {guideObj.title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-1 rounded-md hover:bg-[var(--bg-muted)]">
                      <X size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="space-y-4">
                  <div className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--blue-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target size={16} strokeWidth={1.5} style={{ color: 'var(--blue)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>Por que es importante?</p>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{guideObj.why}</p>
                  </div>

                  <div className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--green-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--green)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Como medir si se cumplio?</p>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{guideObj.howToMeasure}</p>
                  </div>

                  <div className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--purple-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--purple)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--purple)' }}>En que plazo?</p>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{guideObj.timeframe}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Key Results sugeridos</p>
                    <div className="space-y-2">
                      {guideKRs.map((kr, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={kr.title}
                            onChange={e => { const n = [...guideKRs]; n[i] = { ...n[i], title: e.target.value }; setGuideKRs(n) }}
                            className="flex-1 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm"
                            style={{ color: 'var(--text-primary)' }}
                          />
                          <input
                            type="number"
                            value={kr.target_value}
                            onChange={e => { const n = [...guideKRs]; n[i] = { ...n[i], target_value: e.target.value }; setGuideKRs(n) }}
                            className="w-20 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-center"
                            style={{ color: 'var(--text-primary)' }}
                          />
                          <span className="text-xs w-20 truncate" style={{ color: 'var(--text-muted)' }}>{kr.unit}</span>
                          <button type="button" onClick={() => setGuideKRs(guideKRs.filter((_, j) => j !== i))}>
                            <X size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--yellow-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--yellow)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--yellow)' }}>Errores comunes</p>
                    </div>
                    <ul className="space-y-1">
                      {guideObj.mistakes.map((m, i) => (
                        <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0" style={{ background: 'var(--yellow)' }} />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]">
                  <button
                    onClick={showNextGuide}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-base)] hover:bg-[var(--bg-subtle)] transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ArrowRight size={16} strokeWidth={1.5} />
                    Ver otro
                  </button>
                  <button
                    onClick={createFromGuide}
                    disabled={creatingFromGuide}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-[var(--radius-md)] text-white disabled:opacity-50 transition-colors"
                    style={{ background: 'var(--blue)' }}
                  >
                    {creatingFromGuide ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Plus size={16} strokeWidth={1.5} />}
                    Usar este objetivo
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {loading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />)}</div>
      ) : objectives.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay objetivos para {quarter} {year}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(obj => {
            const progress = getObjProgress(obj)
            const isExpanded = expanded === obj.id
            return (
              <div key={obj.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center hover:bg-slate-50 transition-colors">
                <button onClick={() => setExpanded(isExpanded ? null : obj.id)} className="flex-1 flex items-center gap-4 p-5 text-left">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{progress}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{obj.title}</h3>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border',
                        obj.type === 'agency' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      )}>{obj.type === 'agency' ? 'Agencia' : 'Cliente'}</span>
                      {obj.clients && <span className="text-xs text-slate-400">{obj.clients.name}</span>}
                    </div>
                    {obj.description && <p className="text-xs text-slate-500 mt-1 truncate">{obj.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">{(obj.key_results || []).length} key results</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>
                <div className="flex items-center gap-1 pr-4 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEditObj(obj) }} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar objetivo">
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteObjId(obj.id) }} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar objetivo">
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 space-y-4">
                    {(obj.key_results || []).map(kr => {
                      const krProg = getKRProgress(kr)
                      return (
                        <div key={kr.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{kr.title}</p>
                              <p className="text-xs text-slate-400">{Number(kr.current_value).toLocaleString()} / {Number(kr.target_value).toLocaleString()} {kr.unit || ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs font-bold', krProg >= 70 ? 'text-green-600' : krProg >= 40 ? 'text-amber-600' : 'text-red-600')}>{krProg}%</span>
                              <button onClick={() => { setShowUpdateKR(showUpdateKR === kr.id ? null : kr.id); setKRValue(String(kr.current_value)) }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Actualizar</button>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', krProg >= 70 ? 'bg-green-500' : krProg >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${krProg}%` }} />
                          </div>
                          {showUpdateKR === kr.id && (
                            <div className="flex items-center gap-2 pt-1">
                              <input type="number" step="0.01" value={krValue} onChange={e => setKRValue(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm" placeholder="Nuevo valor" />
                              <button onClick={() => handleUpdateKR(kr.id, obj.id)} disabled={saving} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {showKRForm === obj.id ? (
                      <form onSubmit={(e) => handleCreateKR(e, obj.id)} className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><label className="text-xs text-slate-500 mb-1 block">Titulo *</label><input name="title" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Tipo metrica</label><select name="metric_type" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"><option value="percentage">Porcentaje</option><option value="number">Numero</option><option value="currency">Moneda</option><option value="boolean">Booleano</option></select></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Unidad</label><input name="unit" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="%, USD, unid..." /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><label className="text-xs text-slate-500 mb-1 block">Valor inicial</label><input name="start_value" type="number" step="0.01" defaultValue="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Valor objetivo *</label><input name="target_value" type="number" step="0.01" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Fecha limite</label><input name="due_date" type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">Crear KR</button>
                          <button type="button" onClick={() => setShowKRForm(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setShowKRForm(obj.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium pt-2">
                        <Plus className="h-3 w-3" /> Agregar Key Result
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit Objective Modal ── */}
      <Dialog.Root open={!!editObj} onOpenChange={open => { if (!open) setEditObj(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-bold text-slate-900">Editar objetivo</Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-slate-500">Modifica los datos del objetivo</Dialog.Description>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Titulo *</label>
                <input value={editObjData.title} onChange={e => setEditObjData(p => ({ ...p, title: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Descripcion</label>
                <textarea value={editObjData.description} onChange={e => setEditObjData(p => ({ ...p, description: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 h-20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Trimestre</label>
                  <select value={editObjData.quarter} onChange={e => setEditObjData(p => ({ ...p, quarter: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900">
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Ano</label>
                  <select value={editObjData.year} onChange={e => setEditObjData(p => ({ ...p, year: parseInt(e.target.value) }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900">
                    {[new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label>
                <select value={editObjData.client_id} onChange={e => setEditObjData(p => ({ ...p, client_id: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900">
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditObj(null)} className="text-sm text-slate-500 hover:text-slate-900 font-medium px-4 py-2">Cancelar</button>
              <button onClick={handleEditObj} disabled={editObjSaving || !editObjData.title} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editObjSaving ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin inline mr-1" /> : null}
                Guardar
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete Objective Confirmation ── */}
      <Dialog.Root open={!!deleteObjId} onOpenChange={open => { if (!open) setDeleteObjId(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl p-6 space-y-4">
            <Dialog.Title className="text-lg font-bold text-slate-900">Eliminar objetivo</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500">
              Este objetivo y todos sus key results seran eliminados permanentemente. Esta accion no se puede deshacer.
            </Dialog.Description>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeleteObjId(null)} className="text-sm text-slate-500 hover:text-slate-900 font-medium px-4 py-2">Cancelar</button>
              <button onClick={handleDeleteObj} disabled={deletingObj} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingObj ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin inline mr-1" /> : null}
                Eliminar
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {!loading && objectives.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Resumen {quarter} {year}</h3>
          </div>
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Objetivo</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Key Results</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Progreso</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {[...objectives].sort((a, b) => getObjProgress(b) - getObjProgress(a)).map(obj => {
                const p = getObjProgress(obj)
                return (
                  <tr key={obj.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{obj.title}</td>
                    <td className="px-5 py-3 text-center text-xs text-slate-500">{obj.type === 'agency' ? 'Agencia' : 'Cliente'}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-600">{(obj.key_results || []).length}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${p}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8">{p}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
