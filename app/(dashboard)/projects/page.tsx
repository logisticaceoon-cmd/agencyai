import { redirect } from 'next/navigation'
import { requireAuthWithOrg } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FolderKanban, Plus } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'

const serviceLabels: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  landing_page: 'Landing Page',
  ecommerce: 'E-commerce',
  mentoring: 'Mentoría',
  social_media: 'Redes Sociales',
  seo: 'SEO',
  email_marketing: 'Email',
  content: 'Contenido',
  design: 'Diseño',
  other: 'Otro',
}

export default async function ProjectsPage() {
  const { org } = await requireAuthWithOrg()

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, fullName: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Gestión de proyectos por cliente y tipo de servicio"
      />

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No hay proyectos" description="Los proyectos se crean desde la ficha del cliente" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div key={proj.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{proj.name}</p>
                  {proj.client && (
                    <p className="text-xs text-zinc-500 mt-0.5">{proj.client.name}</p>
                  )}
                </div>
                <StatusBadge status={proj.status} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {proj.serviceType && (
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                    {serviceLabels[proj.serviceType] ?? proj.serviceType}
                  </span>
                )}
                <span className="text-xs text-zinc-600">{proj._count.tasks} tareas</span>
              </div>
              {proj.manager && (
                <p className="text-xs text-zinc-600 mt-2">Responsable: {proj.manager.fullName}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
