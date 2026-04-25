import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// 0 12 5 * * = 9 AM Argentina on day 5 of each month
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL_REAL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY_REAL || ''
    const workspaceId = '41b4b8ab-2483-418d-bb29-d39084ca36f0'

    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const currentMonth = argNow.getUTCMonth() + 1
    const currentYear = argNow.getUTCFullYear()
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const MONTHS_ES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    // Pull finance monthly data for current and previous month
    const [curRes, prevRes, expRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/finance_client_monthly?workspace_id=eq.${workspaceId}&month=eq.${currentMonth}&year=eq.${currentYear}&select=fee,commission,client_id,status`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
      fetch(`${supabaseUrl}/rest/v1/finance_client_monthly?workspace_id=eq.${workspaceId}&month=eq.${prevMonth}&year=eq.${prevYear}&select=fee,commission,status`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
      fetch(`${supabaseUrl}/rest/v1/expenses?workspace_id=eq.${workspaceId}&month=eq.${currentMonth}&year=eq.${currentYear}&select=amount,category,description`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
    ])

    const curData = await curRes.json()
    const prevData = await prevRes.json()
    const expData = await expRes.json()

    const sum = (arr: any[], field: string) =>
      (Array.isArray(arr) ? arr : []).reduce((acc: number, r: any) => acc + (parseFloat(r[field]) || 0), 0)

    const curFees = sum(curData, 'fee')
    const curComm = sum(curData, 'commission')
    const curTotal = curFees + curComm

    const prevFees = sum(prevData, 'fee')
    const prevComm = sum(prevData, 'commission')
    const prevTotal = prevFees + prevComm

    const totalExpenses = Array.isArray(expData) ? sum(expData, 'amount') : 0
    const margin = curTotal - totalExpenses
    const marginPct = curTotal > 0 ? ((margin / curTotal) * 100).toFixed(1) : '0'

    const pctChange = prevTotal > 0 ? (((curTotal - prevTotal) / prevTotal) * 100).toFixed(1) : 'N/A'
    const trend = parseFloat(pctChange) >= 0 ? '📈' : '📉'
    const trendColor = parseFloat(pctChange) >= 0 ? '#16a34a' : '#dc2626'

    // Nómina/gastos breakdown
    let expenseRows = ''
    if (Array.isArray(expData) && expData.length > 0) {
      expenseRows = expData.map((e: any) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">${e.category || 'General'}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9">${e.description || ''}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right">$${parseFloat(e.amount).toFixed(2)}</td></tr>`
      ).join('')
    } else {
      expenseRows = `<tr><td colspan="3" style="padding:8px;color:#94a3b8;text-align:center">Sin gastos registrados en AgencyAi este mes</td></tr>`
    }

    const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:12px">
        💰 Reporte Financiero — ${MONTHS_ES[currentMonth]} ${currentYear}
      </h2>
      <p style="color:#64748b;font-size:14px">Generado el día 5 · Ceonyx · Logística CEOON</p>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:24px 0">
        <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center">
          <div style="color:#16a34a;font-size:22px;font-weight:700">$${curFees.toFixed(0)}</div>
          <div style="color:#64748b;font-size:12px;margin-top:4px">Fees</div>
        </div>
        <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center">
          <div style="color:#2563eb;font-size:22px;font-weight:700">$${curComm.toFixed(0)}</div>
          <div style="color:#64748b;font-size:12px;margin-top:4px">Comisiones</div>
        </div>
        <div style="background:#fafafa;border-radius:10px;padding:16px;text-align:center;border:2px solid #0f172a">
          <div style="color:#0f172a;font-size:22px;font-weight:700">$${curTotal.toFixed(0)}</div>
          <div style="color:#64748b;font-size:12px;margin-top:4px">Total bruto</div>
        </div>
      </div>

      <!-- Comparativo -->
      <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:16px 0">
        <h3 style="margin:0 0 12px;color:#0f172a">📊 vs ${MONTHS_ES[prevMonth]} ${prevYear}</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#64748b">Mes anterior</td>
            <td style="padding:6px 0;text-align:right;font-weight:600">$${prevTotal.toFixed(0)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b">Este mes</td>
            <td style="padding:6px 0;text-align:right;font-weight:600">$${curTotal.toFixed(0)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b">Variación</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:${trendColor}">${trend} ${pctChange}%</td>
          </tr>
        </table>
      </div>

      <!-- Gastos y margen -->
      <div style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0">
        <h3 style="margin:0 0 12px;color:#92400e">🧾 Gastos registrados</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#fef3c7">
            <th style="padding:8px;text-align:left;font-size:12px">Categoría</th>
            <th style="padding:8px;text-align:left;font-size:12px">Descripción</th>
            <th style="padding:8px;text-align:right;font-size:12px">Monto</th>
          </tr>
          ${expenseRows}
          <tr style="border-top:2px solid #f59e0b">
            <td colspan="2" style="padding:8px;font-weight:700">Total gastos</td>
            <td style="padding:8px;text-align:right;font-weight:700">$${totalExpenses.toFixed(0)}</td>
          </tr>
        </table>
      </div>

      <!-- Margen -->
      <div style="background:${margin >= 0 ? '#f0fdf4' : '#fef2f2'};border-radius:10px;padding:20px;margin:16px 0;text-align:center">
        <div style="color:#64748b;font-size:13px;margin-bottom:8px">Margen neto (bruto − gastos)</div>
        <div style="font-size:32px;font-weight:800;color:${margin >= 0 ? '#16a34a' : '#dc2626'}">
          $${margin.toFixed(0)}
        </div>
        <div style="color:#64748b;font-size:13px;margin-top:4px">${marginPct}% de margen</div>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
        Ceonyx · Agente IA — Logística CEOON · Reporte automático día 5
      </p>
    </div>`

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'logisticaceoon@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: '"Ceonyx · CEOON" <logisticaceoon@gmail.com>',
      to: 'logisticaceoon@gmail.com',
      subject: `💰 Reporte Financiero ${MONTHS_ES[currentMonth]} ${currentYear} — $${curTotal.toFixed(0)} bruto · ${trend}${pctChange}%`,
      html,
    })

    return NextResponse.json({ success: true, curTotal, prevTotal, margin, pctChange })
  } catch (err: any) {
    console.error('monthly-finance error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
