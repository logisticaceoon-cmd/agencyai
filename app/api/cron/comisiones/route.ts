import { NextResponse } from 'next/server'
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const nowUTC = new Date()
    const argOffset = -3 * 60 * 60 * 1000
    const argNow = new Date(nowUTC.getTime() + argOffset)

    const dayOfMonth = argNow.getUTCDate()

    // Solo correr días 1, 2 y 3 del mes
    if (dayOfMonth > 3) {
      return NextResponse.json({ success: true, skipped: `day ${dayOfMonth} not in 1-3` })
    }

    const currentMonth = MONTHS[argNow.getUTCMonth()]
    const prevMonthIndex = argNow.getUTCMonth() === 0 ? 11 : argNow.getUTCMonth() - 1
    const prevMonth = MONTHS[prevMonthIndex]

    const subject = `💰 Registrar comisiones de ${prevMonth} — Día ${dayOfMonth} de ${currentMonth}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;padding:0 12px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">

      <div style="background:linear-gradient(135deg,#064e3b 0%,#047857 100%);padding:24px 28px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:700;">💰 Registrar comisiones de ${prevMonth}</h1>
        <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Día ${dayOfMonth} de ${currentMonth} · Logística CEOON</p>
      </div>

      <div style="padding:24px 28px;">
        <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.6;">
          Es inicio de mes. Hay que calcular y registrar las comisiones de <strong>${prevMonth}</strong> antes de armar las notas de cobro.
        </p>

        <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;">Clientes con comisión pendiente:</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr style="background:#f3f4f6;">
              <th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:600;border-radius:4px 0 0 4px;">Cliente</th>
              <th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:600;">Datos necesarios</th>
              <th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:600;border-radius:0 4px 4px 0;">Comisión</th>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#1f2937;font-weight:600;">FOOD4KIDS</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Ventas web, envíos, tasa COP/USD</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">4%</span></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#1f2937;font-weight:600;">DIVINASTORE</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Ventas, ads, tasa CLP/USD</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">3.5%</span></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#1f2937;font-weight:600;">YASMIN.TENDENCIA</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Ventas, ads, envíos, tasa CLP/USD</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">3.5%</span></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;color:#6b7280;">RMONIA SPA</td>
              <td style="padding:10px 12px;color:#9ca3af;">Sin comisión</td>
              <td style="padding:10px 12px;"><span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:4px;font-size:12px;">$500 fijo</span></td>
            </tr>
          </table>
        </div>

        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            <strong>Recordá:</strong> la comisión corresponde a <strong>${prevMonth}</strong> (mes anterior).
            El fee es del mes actual. Ambos se cobran juntos. Pedí la tasa Binance del día al calcular.
          </p>
        </div>

        <div style="text-align:center;">
          <a href="https://agencyai-iota.vercel.app/finances"
             style="display:inline-block;background:#064e3b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Ir a Finanzas en AgencyAi →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
          Enviado automáticamente días 1-3 del mes · Ceonyx — Logística CEOON
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
        subject,
        html,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.GMAIL_APP_PASSWORD,
      day: dayOfMonth,
      prevMonth,
    })
  } catch (error) {
    console.error('Comisiones cron error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
