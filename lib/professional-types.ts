// Static definitions matching the DB for UI selectors (onboarding, settings)
// Keep this in sync with migration 013

export interface ProfessionalTypeDef {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

export const PROFESSIONAL_TYPES: ProfessionalTypeDef[] = [
  { id: 'marketing_agency', name: 'Agencia de Marketing Digital', description: 'Tráfico pago, redes sociales y performance', icon: '📊', color: '#2563eb' },
  { id: 'media_buyer', name: 'Media Buyer / Trafficker', description: 'Compra de medios y pauta publicitaria', icon: '📢', color: '#dc2626' },
  { id: 'accounting', name: 'Contador / Estudio Contable', description: 'Contadores y asesores fiscales', icon: '📋', color: '#16a34a' },
  { id: 'graphic_designer', name: 'Diseñador Gráfico / Creativo', description: 'Diseñadores y estudios creativos', icon: '🎨', color: '#7c3aed' },
  { id: 'design_studio', name: 'Estudio de Diseño', description: 'Estudio de diseño gráfico y branding', icon: '🎨', color: '#7c3aed' },
  { id: 'filmmaker', name: 'Filmmaker / Productor de Video', description: 'Camarógrafos, productores, editores', icon: '🎬', color: '#dc2626' },
  { id: 'web_developer', name: 'Desarrollador Web / Tech', description: 'Devs, agencias tech y freelancers', icon: '💻', color: '#0891b2' },
  { id: 'dev_agency', name: 'Agencia de Desarrollo', description: 'Agencia de desarrollo de software', icon: '💻', color: '#059669' },
  { id: 'consultant', name: 'Consultor / Coach', description: 'Consultores, coaches y mentores', icon: '🎯', color: '#ea580c' },
  { id: 'consulting', name: 'Consultoría Empresarial', description: 'Firma de consultoría empresarial', icon: '💼', color: '#d97706' },
  { id: 'lawyer', name: 'Abogado / Despacho Legal', description: 'Abogados y despachos jurídicos', icon: '⚖️', color: '#374151' },
  { id: 'real_estate', name: 'Inmobiliaria / Bienes Raíces', description: 'Agentes inmobiliarios', icon: '🏠', color: '#16a34a' },
  { id: 'health_professional', name: 'Profesional de Salud', description: 'Médicos, psicólogos, nutricionistas', icon: '🏥', color: '#0891b2' },
  { id: 'education', name: 'Educador / Academia', description: 'Profesores, tutores, centros educativos', icon: '📚', color: '#f59e0b' },
  { id: 'photographer', name: 'Fotógrafo / Estudio', description: 'Fotógrafos profesionales y estudios', icon: '📸', color: '#ec4899' },
  { id: 'ecommerce', name: 'E-commerce / Tienda Online', description: 'Vendedores y tiendas online', icon: '🛒', color: '#16a34a' },
  { id: 'social_media', name: 'Creador de Contenido / Influencer', description: 'Creadores, influencers, CMs', icon: '📱', color: '#7c3aed' },
  { id: 'hr_recruiter', name: 'RRHH / Reclutador', description: 'Consultoras de RRHH y reclutadores', icon: '👥', color: '#0891b2' },
  { id: 'other', name: 'Otro / Personalizado', description: 'Otro tipo de servicio profesional', icon: '⚡', color: '#64748b' },
]
