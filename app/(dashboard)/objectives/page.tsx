import { requireAuthWithOrg } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function ObjectivesPage() {
  const { org } = await requireAuthWithOrg()

  const objectives = await prisma.objective.findMany({
    where: { organizationId: org.id, status: 'active' },
    orderBy: { endDate: 'asc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Objetivos" description="Seguimiento de objetivos del mes" />

      {objectives.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Target className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No hay objetivos activos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const progress = Math.min(100, Math.round((Number(obj.current) / Number(obj.target)) * 100))
            const isOnTrack = progress >= 50
            return (
              <div key={obj.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{obj.name}</p>
                    {obj.description && <p className="text-xs text-zinc-500 mt-0.5">{obj.description}</p>}
                  </div>
                  <span className={cn(
                    'text-xs rounded-full px-2 py-0.5 border capitalize',
                    obj.type === 'organization' ? 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10' :
                    obj.type === 'team' ? 'text-blue-300 border-blue-500/20 bg-blue-500/10' :
                    'text-zinc-300 border-zinc-700 bg-zinc-800'
                  )}>
                    {obj.type}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>{Number(obj.current).toLocaleString()} {obj.unit}</span>
                      <span>Meta: {Number(obj.target).toLocaleString()} {obj.unit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div
                        className={cn('h-full rounded-full transition-all', isOnTrack ? 'bg-green-500' : 'bg-yellow-500')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold w-12 text-right', isOnTrack ? 'text-green-400' : 'text-yellow-400')}>
                    {progress}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
