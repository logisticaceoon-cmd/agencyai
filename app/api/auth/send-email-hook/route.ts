import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

function verifySecret(request: Request): { ok: boolean; received: string; expected: string } {
  const authHeader = request.headers.get("authorization") || ""
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET || ""
  const expected = `Bearer ${secret}`
  return {
    ok: authHeader === expected,
    received: authHeader.substring(0, 20) + (authHeader.length > 20 ? "..." : ""),
    expected: expected.substring(0, 20) + (expected.length > 20 ? "..." : ""),
  }
}

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "logisticaceoon@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function buildConfirmationUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo?: string
) {
  const base = siteUrl.replace(/\/$/, "")
  let url = `${base}/auth/confirm?token_hash=${tokenHash}&type=${type}`
  if (redirectTo) url += `&next=${encodeURIComponent(redirectTo)}`
  return url
}

function getEmailContent(type: string, confirmationUrl: string, userEmail: string) {
  const subjects: Record<string, string> = {
    signup: "Confirmá tu cuenta — AgencyAI",
    recovery: "Recuperar contraseña — AgencyAI",
    invite: "Te invitaron a AgencyAI",
    magiclink: "Tu link de acceso — AgencyAI",
  }
  const labels: Record<string, string> = {
    signup: "Confirmar mi cuenta",
    recovery: "Restablecer contraseña",
    invite: "Aceptar invitación",
    magiclink: "Iniciar sesión",
  }

  const subject = subjects[type] || subjects["signup"]
  const btnLabel = labels[type] || labels["signup"]
  const intro =
    type === "recovery"
      ? `Recibimos una solicitud para restablecer la contraseña de <strong>${userEmail}</strong>.<br>Hacé click en el botón para crear una nueva contraseña.`
      : "Hacé click en el botón para continuar."

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:40px auto;padding:0 20px;">
        <div style="background:#2563eb;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">⚡ AgencyAI</h1>
        </div>
        <div style="background:white;padding:40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
          <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">${subject}</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 32px;">${intro}</p>
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${confirmationUrl}"
               style="background:#2563eb;color:white;padding:14px 40px;border-radius:10px;
                      text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
              ${btnLabel}
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">
            Este enlace expira en <strong>24 horas</strong>. Si no solicitaste esto, ignorá este email.
          </p>
          <p style="color:#cbd5e1;font-size:12px;margin:0;word-break:break-all;">
            Si el botón no funciona, copiá este link: ${confirmationUrl}
          </p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin:20px 0;">
          AgencyAI — Sistema de gestión para agencias de marketing
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

export async function POST(request: Request) {
  try {
    const auth = verifySecret(request)
    if (!auth.ok) {
      console.error(`[send-email-hook] 401 — header mismatch. received="${auth.received}" expected="${auth.expected}" secret_set=${!!process.env.SUPABASE_AUTH_HOOK_SECRET}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { user, email_data } = body

    if (!user?.email || !email_data) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const { token_hash, email_action_type, site_url, redirect_to } = email_data
    const actionType = email_action_type || "signup"
    const siteUrl = site_url || "https://agencyai-iota.vercel.app"

    const confirmationUrl = buildConfirmationUrl(siteUrl, token_hash, actionType, redirect_to)
    const { subject, html } = getEmailContent(actionType, confirmationUrl, user.email)

    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "AgencyAI <logisticaceoon@gmail.com>",
      to: user.email,
      subject,
      html,
    })

    console.log(`[send-email-hook] Email sent OK — type=${actionType} to=${user.email}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[send-email-hook] Error:", error)
    return NextResponse.json({ error: "Error enviando email" }, { status: 500 })
  }
}
