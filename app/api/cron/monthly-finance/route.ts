import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const RAFAEL_EMAIL = process.env.RAFAEL_EMAIL || ''
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'AgencyAI <noreply@agencyai.app>'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function pctDiff(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '+100%' : '0%'
  const diff = ((current - prev) / prev) * 100
  return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%'
}

function pctColor(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '#16a34a' : '#6b7280'
  return current >= prev ? '#16a34a' : '#dc2626'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const nowUTC = new Date()
    const argOffset = -3 * 60 * 60 * 1000
    const argNow = new Date(nowUTC.getTime() + argOffset)

    // Mes actual = mes que acaba de cerrar (el día 5 ya pasó el mes anterior)
    const currentMonthIdx = argNow.getUTCMonth()     // mayo = 4
    const prevMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1  // abril = 3
    const prevPrevMonthIdx = prevMonthIdx === 0 ? 11 : prevMonthIdx - 1    // marzo = 2

    const year = currentMonthIdx === 0 ? argNow.getUTCFullYear() - 1 : argNow.getUTCFullYear()
    const prevYear = prevMonthIdx === 0 ? year - 1 : year

    const prevMonthName = MONTHS[prevMonthIdx]
    const prevPrevMonthName = MONTHS[prevPrevMonthIdx]

    const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID
    if (!WORKSPACE_ID) {
      return NextResponse.json({ error: 'DEFAULT_WORKSPACE_ID not configured' }, { status: 500 })
    }

    // Leer finance_client_monthly del mes anterior y del anterior-anterior
    const { data: prevMonthData } = await supabase
      .from('finance_client_monthly')
      .select('client_id, billed_amount, commission_amount, month, year')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('month', prevMonthIdx + 1)   // meses en DB son 1-indexed
      .eq('year', prevYear)

    const { data: prevPrevMonthData } = await supabase
      .from('finance_client_monthly')
      .select('client_id, billed_amount, commission_amount, month, year')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('month', prevPrevMonthIdx + 1)
      .eq('year', prevYear)

    // Leer clientes activos
    const { data: clients } = await supabase
      .from('finance_clients')
      .select('id, client_name, contract_cost, is_active')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('is_active', true)
      .order('client_name')

    const prevRows = prevMonthData || []
    const prevPrevRows = prevPrevMonthData || []
    const clientList = clients || []

    // Totales mes anterior
    const totalFees = prevRows.reduce((s, r) => s + (r.billed_amount || 0), 0)
    const totalComisiones = prevRows.reduce((s, r) => s + (r.commission_amount || 0), 0)
    const totalGeneral = totalFees + totalComisiones

    // Totales mes anterior-anterior
    const totalFeesPrev = prevPrevRows.reduce((s, r) => s + (r.billed_amount || 0), 0)
    const totalComisionesPrev = prevPrevRows.reduce((s, r) => s + (r.commission_amount || 0), 0)
    const totalGeneralPrev = totalFeesPrev + totalComisionesPrev

    // Tabla por cliente
    const clientRows = clientList.map(c => {
      const curr = prevRows.find(r => r.client_id === c.id)
      const prev = prevPrevRows.find(r => r.client_id === c.id)

      const fee = curr?.billed_amount || 0
      const com = curr?.commission_amount || 0
      const total = fee + com

      const feePrev = prev?.billed_amount || 0
      const comPrev = prev?.commission_amount || 0
      const totalPrev = feePrev + comPrev

      return { name: c.client_name, fee, com, total, totalPrev }
    }).filter(c => c.total > 0 || c.fee > 0)

    // Clientes sin datos cargados
    const sinDatos = clientList.filter(c =>
      !prevRows.find(r => r.client_id === c.id)
    )

    // ── Render ───────────────────────────────────────────────────────
    const clientTableRows = clientRows.map(c => {
      const diff = pctDiff(c.total, c.totalPrev)
      const color = pctColor(c.total, c.totalPrev)
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;">${c.name}</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:right;">${usd(c.fee)}</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:right;">${usd(c.com)}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#111827;text-align:right;">${usd(c.total)}</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:${color};text-align:right;">${diff}</td>
        </tr>`
    }).join('')

    const sinDatosBlock = sinDatos.length > 0
      ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-weight:700;color:#c2410c;font-size:13px;">⚠️ Sin datos cargados en ${prevMonthName}:</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.9;">
            ${sinDatos.map(c => `<li>${c.client_name}</li>`).join('')}
          </ul>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Entrá a AgencyAi → Finanzas y cargá los datos del mes.</p>
        </div>` : ''

    const noData = prevRows.length === 0
    const summaryBlock = noData
      ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#b91c1c;font-weight:600;">No hay datos registrados para ${prevMonthName}.</p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Cargá fees y comisiones en AgencyAi → Finanzas antes de cerrar el mes.</p>
        </div>`
      : `<!-- Totales -->
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:10px;padding:16px 18px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total Fees</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#15803d;">${usd(totalFees)}</p>
            <p style="margin:4px 0 0;font-size:11px;color:${pctColor(totalFees, totalFeesPrev)};">${pctDiff(totalFees, totalFeesPrev)} vs ${prevPrevMonthName}</p>
          </div>
          <div style="flex:1;min-width:140px;background:#eff6ff;border-radius:10px;padding:16px 18px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Comisiones</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1d4ed8;">${usd(totalComisiones)}</p>
            <p style="margin:4px 0 0;font-size:11px;color:${pctColor(totalComisiones, totalComisionesPrev)};">${pctDiff(totalComisiones, totalComisionesPrev)} vs ${prevPrevMonthName}</p>
          </div>
          <div style="flex:1;min-width:140px;background:#fdf4ff;border-radius:10px;padding:16px 18px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total General</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#7c3aed;">${usd(totalGeneral)}</p>
            <p style="margin:4px 0 0;font-size:11px;color:${pctColor(totalGeneral, totalGeneralPrev)};">${pctDiff(totalGeneral, totalGeneralPrev)} vs ${prevPrevMonthName}</p>
          </div>
        </div>

        <!-- Tabla por cliente -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-radius:6px 0 0 0;">Cliente</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Fee</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Comisión</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Total</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-radius:0 6px 0 0;">vs ${prevPrevMonthName}</th>
            </tr>
          </thead>
          <tbody>${clientTableRows}</tbody>
          <tfoot>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;">TOTAL</td>
              <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;text-align:right;">${usd(totalFees)}</td>
              <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;text-align:right;">${usd(totalComisiones)}</td>
              <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;text-align:right;">${usd(totalGeneral)}</td>
              <td style="padding:12px 14px;font-size:13px;font-weight:700;color:${pctColor(totalGeneral, totalGeneralPrev)};text-align:right;">${pctDiff(totalGeneral, totalGeneralPrev)}</td>
            </tr>
          </tfoot>
        </table>`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:620px;margin:24px auto;padding:0 12px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">

      <div style="background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 100%);padding:24px 28px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:700;">📊 Reporte Financiero — ${prevMonthName} ${prevYear}</h1>
        <p style="margin:6px 0 0;color:#a5b4fc;font-size:13px;">Logística CEOON · Generado el 5 de ${MONTHS[currentMonthIdx]}</p>
      </div>

      <div style="padding:24px 28px;">

        ${sinDatosBlock}
        ${summaryBlock}

        <div style="text-align:center;margin-top:20px;">
          <a href="https://agencyai-iota.vercel.app/finances"
             style="display:inline-block;background:#1e1b4b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Ver finanzas completas →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
          Enviado automáticamente el día 5 de cada mes · Ceonyx — Logística CEOON
        </p>
      </div>

    </div>
  </div>
</body>
</html>`

    if (process.env.GMAIL_APP_PASSWORD) {
      const transporter = getTransporter()
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: RAFAEL_EMAIL,
        subject: `📊 Reporte ${prevMonthName} ${prevYear} — ${usd(totalGeneral)} total`,
        html,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.GMAIL_APP_PASSWORD,
      month: prevMonthName,
      summary: { totalFees, totalComisiones, totalGeneral, clients: clientRows.length },
    })
  } catch (error) {
    console.error('Monthly finance cron error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
