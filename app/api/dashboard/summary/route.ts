import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const now = new Date().toISOString()

    const [
      clientsResult,
      activeClientsResult,
      tasksResult,
      completedTasksResult,
      overdueTasksResult,
      reportsResult,
      processedReportsResult,
      pendingReportsResult,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).is('deleted_at', null),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).is('deleted_at', null).eq('status', 'active'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).is('deleted_at', null).neq('status', 'rejected'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).is('deleted_at', null).eq('status', 'completed'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).is('deleted_at', null).in('status', ['pending', 'in_progress']).lt('due_date', now),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('status', ['validated', 'rejected']),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending'),
    ])

    return NextResponse.json({
      totalClients: clientsResult.count || 0,
      clientsOnTrack: activeClientsResult.count || 0,
      tasksTotal: tasksResult.count || 0,
      tasksCompleted: completedTasksResult.count || 0,
      tasksOverdue: overdueTasksResult.count || 0,
      reportsTotal: reportsResult.count || 0,
      reportsProcessed: processedReportsResult.count || 0,
      reportsPending: pendingReportsResult.count || 0,
      complianceScore: 0,
      monthlyRevenue: 0,
      pendingPayments: 0,
    })
  } catch (err) {
    console.error('Error fetching dashboard summary:', err)
    return NextResponse.json({
      totalClients: 0, clientsOnTrack: 0, tasksTotal: 0, tasksCompleted: 0,
      tasksOverdue: 0, reportsTotal: 0, reportsProcessed: 0, reportsPending: 0,
      complianceScore: 0, monthlyRevenue: 0, pendingPayments: 0,
    })
  }
}
