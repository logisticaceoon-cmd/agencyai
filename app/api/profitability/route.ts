import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '6')

    // Fetch all active clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, status, monthly_value, currency')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ clients: [], totals: { revenue: 0, costs: 0, profit: 0, margin: 0 }, trends: [] })
    }

    const clientIds = clients.map(c => c.id)
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    // Fetch invoices (paid = revenue)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, client_id, total, status, paid_at, created_at')
      .eq('workspace_id', workspaceId)
      .in('client_id', clientIds)

    // Fetch time entries with hourly rates
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('id, client_id, duration_minutes, hourly_rate, billable, start_time')
      .eq('workspace_id', workspaceId)
      .in('client_id', clientIds)

    // Fetch ad spend
    const { data: adSpend } = await supabase
      .from('ad_spend_records')
      .select('id, client_id, amount, period_start')
      .eq('workspace_id', workspaceId)
      .in('client_id', clientIds)

    // Fetch default hourly rate from workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('default_hourly_rate')
      .eq('id', workspaceId)
      .single()

    const defaultRate = workspace?.default_hourly_rate || 50

    // Build per-client profitability
    const clientProfitability = clients.map(client => {
      // Revenue: paid invoices
      const clientInvoices = (invoices || []).filter(i => i.client_id === client.id)
      const revenue = clientInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0)

      const revenueThisMonth = clientInvoices
        .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= thisMonthStart)
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0)

      const revenueLastMonth = clientInvoices
        .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= lastMonthStart && i.paid_at <= lastMonthEnd)
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0)

      // Time cost
      const clientTime = (timeEntries || []).filter(t => t.client_id === client.id)
      const totalHours = clientTime.reduce((sum, t) => sum + ((t.duration_minutes || 0) / 60), 0)
      const timeCost = clientTime.reduce((sum, t) => {
        const rate = t.hourly_rate || defaultRate
        return sum + ((t.duration_minutes || 0) / 60) * Number(rate)
      }, 0)

      const hoursThisMonth = clientTime
        .filter(t => t.start_time && t.start_time >= thisMonthStart)
        .reduce((sum, t) => sum + ((t.duration_minutes || 0) / 60), 0)

      // Ad spend
      const clientAdSpend = (adSpend || []).filter(a => a.client_id === client.id)
      const totalAdSpend = clientAdSpend.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

      const adSpendThisMonth = clientAdSpend
        .filter(a => a.period_start && a.period_start >= thisMonthStart.slice(0, 10))
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

      // Profitability
      const totalCosts = timeCost + totalAdSpend
      const grossProfit = revenue - totalCosts
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      // Trend (revenue change vs last month)
      const trend = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : revenueThisMonth > 0 ? 100 : 0

      return {
        id: client.id,
        name: client.name,
        status: client.status,
        revenue,
        revenueThisMonth,
        revenueLastMonth,
        timeCost,
        totalHours: Math.round(totalHours * 10) / 10,
        hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
        adSpend: totalAdSpend,
        adSpendThisMonth,
        totalCosts,
        grossProfit,
        margin: Math.round(margin * 10) / 10,
        trend: Math.round(trend * 10) / 10,
      }
    })

    // Totals
    const totals = {
      revenue: clientProfitability.reduce((s, c) => s + c.revenue, 0),
      revenueThisMonth: clientProfitability.reduce((s, c) => s + c.revenueThisMonth, 0),
      costs: clientProfitability.reduce((s, c) => s + c.totalCosts, 0),
      timeCost: clientProfitability.reduce((s, c) => s + c.timeCost, 0),
      adSpend: clientProfitability.reduce((s, c) => s + c.adSpend, 0),
      profit: clientProfitability.reduce((s, c) => s + c.grossProfit, 0),
      margin: 0,
      totalHours: clientProfitability.reduce((s, c) => s + c.totalHours, 0),
    }
    totals.margin = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100 * 10) / 10 : 0

    // Monthly trends for chart (last N months)
    const trends: { month: string; revenue: number; costs: number; profit: number }[] = []
    for (let i = months - 1; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = m.toISOString()
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString()
      const mStartDate = mStart.slice(0, 10)
      const mEndDate = mEnd.slice(0, 10)

      const mRevenue = (invoices || [])
        .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= mStart && i.paid_at <= mEnd)
        .reduce((s, i) => s + (Number(i.total) || 0), 0)

      const mTimeCost = (timeEntries || [])
        .filter(t => t.start_time && t.start_time >= mStart && t.start_time <= mEnd)
        .reduce((s, t) => s + ((t.duration_minutes || 0) / 60) * Number(t.hourly_rate || defaultRate), 0)

      const mAdSpend = (adSpend || [])
        .filter(a => a.period_start && a.period_start >= mStartDate && a.period_start <= mEndDate)
        .reduce((s, a) => s + (Number(a.amount) || 0), 0)

      trends.push({
        month: m.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        revenue: Math.round(mRevenue),
        costs: Math.round(mTimeCost + mAdSpend),
        profit: Math.round(mRevenue - mTimeCost - mAdSpend),
      })
    }

    // Most profitable client
    const mostProfitable = clientProfitability.reduce((best, c) =>
      c.grossProfit > (best?.grossProfit || -Infinity) ? c : best
    , clientProfitability[0])

    const response = NextResponse.json({
      clients: clientProfitability,
      totals,
      trends,
      mostProfitable: mostProfitable ? { name: mostProfitable.name, margin: mostProfitable.margin } : null,
    })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    return response
  } catch (err) {
    console.error('Profitability GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
