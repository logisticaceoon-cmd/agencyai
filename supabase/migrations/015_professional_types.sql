-- ============================================================
-- 015: Add website column + sync professional_types with code
-- ============================================================

-- 1. Add missing website column to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS website TEXT;

-- 2. Ensure professional_type columns exist
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS professional_type_id TEXT DEFAULT 'marketing_agency';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS professional_type_custom TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 3. Create professional_types table if not exists
CREATE TABLE IF NOT EXISTS professional_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⚡',
  color TEXT DEFAULT '#2563eb',
  terminology JSONB DEFAULT '{"clients":"Clientes","projects":"Proyectos","tasks":"Tareas","reports":"Reportes","income":"Ingresos","team":"Equipo"}',
  default_client_categories JSONB DEFAULT '[]',
  suggested_kpis TEXT[] DEFAULT '{}',
  ai_agent_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed all professional types (19 total)
INSERT INTO professional_types (id, name, description, icon, color, terminology, ai_agent_context) VALUES
  ('marketing_agency', 'Agencia de Marketing Digital', 'Trafico pago, redes sociales y performance', '📊', '#2563eb',
   '{"clients":"Clientes","projects":"Campanas","tasks":"Tareas","reports":"Reportes","income":"Facturacion","team":"Equipo"}',
   'Eres un asistente especializado en agencias de marketing digital.'),
  ('media_buyer', 'Media Buyer / Trafficker', 'Compra de medios y pauta publicitaria', '📢', '#dc2626',
   '{"clients":"Anunciantes","projects":"Campanas","tasks":"Optimizaciones","reports":"Reportes","income":"Fee","team":"Traffickers"}',
   'Eres un asistente especializado en compra de medios y pauta publicitaria.'),
  ('accounting', 'Contador / Estudio Contable', 'Contadores y asesores fiscales', '📋', '#16a34a',
   '{"clients":"Clientes","projects":"Expedientes","tasks":"Tramites","reports":"Informes","income":"Honorarios","team":"Equipo"}',
   'Eres un asistente especializado en estudios contables.'),
  ('graphic_designer', 'Disenador Grafico / Creativo', 'Disenadores y estudios creativos', '🎨', '#7c3aed',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Entregas","reports":"Presentaciones","income":"Presupuestos","team":"Equipo"}',
   'Eres un asistente especializado en diseno grafico y creatividad.'),
  ('design_studio', 'Estudio de Diseno', 'Estudio de diseno grafico y branding', '🎨', '#7c3aed',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Tareas","reports":"Entregas","income":"Facturacion","team":"Equipo"}',
   'Eres un asistente especializado en estudios de diseno.'),
  ('filmmaker', 'Filmmaker / Productor de Video', 'Camarografos, productores, editores', '🎬', '#dc2626',
   '{"clients":"Clientes","projects":"Producciones","tasks":"Entregas","reports":"Reportes","income":"Presupuestos","team":"Crew"}',
   'Eres un asistente especializado en produccion audiovisual.'),
  ('web_developer', 'Desarrollador Web / Tech', 'Devs, agencias tech y freelancers', '💻', '#0891b2',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Tickets","reports":"Sprints","income":"Facturacion","team":"Equipo"}',
   'Eres un asistente especializado en desarrollo web y tecnologia.'),
  ('dev_agency', 'Agencia de Desarrollo', 'Agencia de desarrollo de software', '💻', '#059669',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Tickets","reports":"Sprints","income":"Revenue","team":"Developers"}',
   'Eres un asistente especializado en agencias de desarrollo de software.'),
  ('consultant', 'Consultor / Coach', 'Consultores, coaches y mentores', '🎯', '#ea580c',
   '{"clients":"Clientes","projects":"Programas","tasks":"Sesiones","reports":"Informes","income":"Honorarios","team":"Equipo"}',
   'Eres un asistente especializado en consultoria y coaching.'),
  ('consulting', 'Consultoria Empresarial', 'Firma de consultoria empresarial', '💼', '#d97706',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Entregables","reports":"Informes","income":"Honorarios","team":"Consultores"}',
   'Eres un asistente especializado en consultoria empresarial.'),
  ('lawyer', 'Abogado / Despacho Legal', 'Abogados y despachos juridicos', '⚖️', '#374151',
   '{"clients":"Clientes","projects":"Causas","tasks":"Tramites","reports":"Dictamenes","income":"Honorarios","team":"Equipo"}',
   'Eres un asistente especializado en despachos legales.'),
  ('real_estate', 'Inmobiliaria / Bienes Raices', 'Agentes inmobiliarios', '🏠', '#16a34a',
   '{"clients":"Clientes","projects":"Propiedades","tasks":"Visitas","reports":"Informes","income":"Comisiones","team":"Equipo"}',
   'Eres un asistente especializado en bienes raices.'),
  ('health_professional', 'Profesional de Salud', 'Medicos, psicologos, nutricionistas', '🏥', '#0891b2',
   '{"clients":"Pacientes","projects":"Tratamientos","tasks":"Consultas","reports":"Historias clinicas","income":"Honorarios","team":"Equipo"}',
   'Eres un asistente especializado en profesionales de salud.'),
  ('education', 'Educador / Academia', 'Profesores, tutores, centros educativos', '📚', '#f59e0b',
   '{"clients":"Alumnos","projects":"Cursos","tasks":"Clases","reports":"Evaluaciones","income":"Matriculas","team":"Docentes"}',
   'Eres un asistente especializado en educacion.'),
  ('photographer', 'Fotografo / Estudio', 'Fotografos profesionales y estudios', '📸', '#ec4899',
   '{"clients":"Clientes","projects":"Sesiones","tasks":"Entregas","reports":"Galerias","income":"Presupuestos","team":"Equipo"}',
   'Eres un asistente especializado en fotografia profesional.'),
  ('ecommerce', 'E-commerce / Tienda Online', 'Vendedores y tiendas online', '🛒', '#16a34a',
   '{"clients":"Clientes","projects":"Tiendas","tasks":"Pedidos","reports":"Metricas","income":"Ventas","team":"Equipo"}',
   'Eres un asistente especializado en e-commerce.'),
  ('social_media', 'Creador de Contenido / Influencer', 'Creadores, influencers, CMs', '📱', '#7c3aed',
   '{"clients":"Marcas","projects":"Campanas","tasks":"Contenidos","reports":"Metricas","income":"Colaboraciones","team":"Equipo"}',
   'Eres un asistente especializado en creacion de contenido.'),
  ('hr_recruiter', 'RRHH / Reclutador', 'Consultoras de RRHH y reclutadores', '👥', '#0891b2',
   '{"clients":"Empresas","projects":"Busquedas","tasks":"Entrevistas","reports":"Informes","income":"Honorarios","team":"Equipo"}',
   'Eres un asistente especializado en recursos humanos.'),
  ('other', 'Otro / Personalizado', 'Otro tipo de servicio profesional', '⚡', '#64748b',
   '{"clients":"Clientes","projects":"Proyectos","tasks":"Tareas","reports":"Reportes","income":"Ingresos","team":"Equipo"}',
   'Eres un asistente versatil para profesionales independientes y agencias.')
ON CONFLICT (id) DO NOTHING;

-- 5. Grants
GRANT SELECT ON professional_types TO anon, authenticated;
GRANT ALL ON professional_types TO service_role;
