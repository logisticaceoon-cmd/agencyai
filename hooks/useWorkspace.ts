'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/lib/supabase/types'

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const supabase = createClient()
        // Try to get workspace from localStorage cache first
        const cachedWsId = localStorage.getItem('agencyai_workspace_id')

        if (cachedWsId) {
          const { data } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', cachedWsId)
            .single()
          if (data) {
            setWorkspace(data)
            return
          }
        }

        // Fallback: get first workspace where user is owner or member
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('*')
          .limit(1)

        if (workspaces && workspaces.length > 0) {
          setWorkspace(workspaces[0])
          localStorage.setItem('agencyai_workspace_id', workspaces[0].id)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspace()
  }, [])

  return { workspace, loading, setWorkspace }
}
