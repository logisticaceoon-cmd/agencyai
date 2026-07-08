import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { client_id, from_date, to_date, include_non_billable } = body

    if (!client_id) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 })
    }

    // Fetch unbilled time entries for this client in the date range
    let query = supabase
      .from('time_entries')
      .select('id, description, duration_minutes, hourly_rate, billable, start_time, project_id, projects(name)')
      .eq('workspace_id', workspaceId)
      .eq('client_id', client_id)
      .eq('billed', false)
      .eq('status', 'stopped')
      .order('start_time', { ascending: true })

    if (!include_non_billable) {
      query = query.eq('billable', true)
    }
    if (from_date) query = query.gte('start_time', from_date)
    if (to_date) query = query.lte('start_time', to_date)

    const { data: entries, error: entriesError } = await query
    if (entriesError) {
      console.error('Error fetching time entries:', entriesError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No hay entradas de tiempo sin facturar para este periodo' }, { status: 404 })
    }

    // Get default hourly rate
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('default_hourly_rate, currency')
      .eq('id', workspaceId)
      .single()

    const defaultRate = workspace?.default_hourly_rate || 50
    const currency = workspace?.currency || 'USD'

    // Group entries by project for cleaner invoice items
    const projectGroups: Record<string, {
      projectName: string
      entries: typeof entries
      totalMinutes: number
      totalAmount: number
    }> = {}

    for (const entry of entries) {
      const projectKey = entry.project_id || 'sin-proyecto'
      const projectName = (entry as Record<string, unknown>).projects
        ? ((entry as Record<string, unknown>).projects as { name: string }).name
        : 'Sin proyecto'

      if (!projectGroups[projectKey]) {
        projectGroups[projectKey] = { projectName, entries: [], totalMinutes: 0, totalAmount: 0 }
      }

      const rate = entry.hourly_rate || defaultRate
      const hours = (entry.duration_minutes || 0) / 60
      const amount = hours * Number(rate)

      projectGroups[projectKey].entries.push(entry)
      projectGroups[projectKey].totalMinutes += entry.duration_minutes || 0
      projectGroups[projectKey].totalAmount += amount
    }

    // Build invoice items
    const items = Object.values(projectGroups).map(group => {
      const hours = Math.round((group.totalMinutes / 60) * 100) / 100
      const avgRate = group.totalAmount / hours
      return {
        description: `${group.projectName} — ${hours}h (${group.entries.length} entradas)`,
        quantity: hours,
        unit_price: Math.round(avgRate * 100) / 100,
        total: Math.round(group.totalAmount * 100) / 100,
      }
    })

    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const taxRate = 0
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single()

    // Generate invoice number
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        workspace_id: workspaceId,
        client_id,
        number: invoiceNumber,
        status: 'draft',
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency,
        notes: `Generada automaticamente desde entradas de tiempo (${from_date || 'inicio'} — ${to_date || 'hoy'})`,
        created_by: userId,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Mark time entries as billed
    const entryIds = entries.map(e => e.id)
    await supabase
      .from('time_entries')
      .update({ billed: true, invoice_id: invoice.id })
      .in('id', entryIds)
      .eq('workspace_id', workspaceId)

    return NextResponse.json({
      invoice,
      summary: {
        entries_count: entries.length,
        total_hours: Math.round(entries.reduce((s, e) => s + ((e.duration_minutes || 0) / 60), 0) * 100) / 100,
        total_amount: Math.round(total * 100) / 100,
        client_name: client?.name,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('Invoice from time error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
