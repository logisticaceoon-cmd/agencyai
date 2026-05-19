import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import nodemailer from "nodemailer"

/**
 * Verifica la firma Standard Webhooks (v1,whsec_<base64>) que envía Supabase.
 * Si no vienen headers de Standard Webhooks, cae a comparación Bearer simple
 * (útil para pruebas locales).
 */
async function verifyWebhookSignature(request: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET || ""
  if (!secret) return false

  const webhookId        = request.headers.get("webhook-id") || ""
  const webhookTimestamp = request.headers.get("webhook-timestamp") || ""
  const webhookSignature = request.headers.get("webhook-signature") || ""

  // --- Fallback: Bearer simple (dev / testing) ---
  if (!webhookId && !webhookTimestamp && !webhookSignature) {
    const authHeader = request.headers.get("authorization") || ""
    return authHeader === `Bearer ${secret}`
  }

  // --- Validar antigüedad del mensaje (±5 min) ---
  const ts = parseInt(webhookTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  // --- HMAC-SHA256 Standard Webhooks ---
  const secretBase64 = secret.replace(/^v1,whsec_/, "")
  const secretBytes  = Buffer.from(secretBase64, "base64")
  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64")

  // webhook-signature puede ser "v1,<base64> v1,<base64>" (múltiples)
  const signatures = webhookSignature.split(" ").map(s => s.replace(/^v1,/, ""))
  return signatures.some(sig => {
    try {
      return timingSafeEqual(Buffer.from(expected, "base64"), Buffer.from(sig, "base64"))
    } catch {
      return false
    }
  })
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

/**
 * Todas las acciones pasan por /auth/confirm de NUESTRA app (no Supabase).
 * Ignoramos site_url del payload — Supabase lo manda como su propio dominio.
 */
function buildConfirmationUrl(
  _siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo?: string
) {
  // Siempre usar la URL de producción del app, nunca la de Supabase
  const APP_URL = "https://agencyai-iota.vercel.app"

  if (type === "recovery") {
    // Recovery siempre termina en /reset-password
    const next = redirectTo?.includes("/reset-password")
      ? redirectTo
      : `${APP_URL}/reset-password`
    return `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent(next)}`
  }

  let url = `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`
  if (redirectTo) url += `&next=${encodeURIComponent(redirectTo)}`
  return url
}

function getEmailContent(type: string, confirmationUrl: string, userEmail: string) {
  const configs: Record<string, { subject: string; heading: string; intro: string; btn: string; icon: string; color: string }> = {
    recovery: {
      subject: "Restablecer contraseña — AgencyAI",
      heading: "¿Olvidaste tu contraseña?",
      intro: `Recibimos una solicitud para restablecer la contraseña de la cuenta <strong style="color:#1e293b">${userEmail}</strong>.<br><br>Hacé clic en el botón para crear una nueva contraseña. El enlace expira en <strong>24 horas</strong>.`,
      btn: "🔑 Restablecer mi contraseña",
      icon: "🔐",
      color: "#2563eb",
    },
    signup: {
      subject: "Confirmá tu cuenta — AgencyAI",
      heading: "¡Bienvenido a AgencyAI!",
      intro: `Confirmá tu dirección de email para activar tu cuenta <strong style="color:#1e293b">${userEmail}</strong> y empezar a usar AgencyAI.`,
      btn: "✅ Confirmar mi cuenta",
      icon: "🚀",
      color: "#059669",
    },
    invite: {
      subject: "Te invitaron a AgencyAI",
      heading: "Tenés una invitación",
      intro: `Fuiste invitado a unirte a un workspace en AgencyAI con el email <strong style="color:#1e293b">${userEmail}</strong>.`,
      btn: "🤝 Aceptar invitación",
      icon: "✉️",
      color: "#7c3aed",
    },
    magiclink: {
      subject: "Tu link de acceso — AgencyAI",
      heading: "Acceso sin contraseña",
      intro: `Tu link de acceso instantáneo para <strong style="color:#1e293b">${userEmail}</strong>. Hacé clic para iniciar sesión directamente.`,
      btn: "⚡ Iniciar sesión",
      icon: "⚡",
      color: "#d97706",
    },
  }

  const c = configs[type] || configs["signup"]

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${c.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%);
                       border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);
                          border-radius:50%;width:56px;height:56px;line-height:56px;
                          font-size:28px;margin-bottom:16px;">${c.icon}</div>
              <h1 style="color:white;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                ⚡ AgencyAI
              </h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">
                Sistema de gestión para agencias
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:44px 48px 40px;
                       border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <h2 style="color:#0f172a;margin:0 0 12px;font-size:26px;font-weight:700;
                          letter-spacing:-0.5px;line-height:1.2;">
                ${c.heading}
              </h2>

              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 36px;">
                ${c.intro}
              </p>

              <!-- CTA BUTTON -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 36px;">
                <tr>
                  <td align="center" style="border-radius:12px;
                       background:linear-gradient(135deg,${c.color},#60a5fa);
                       box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                    <a href="${confirmationUrl}"
                       style="display:inline-block;padding:16px 40px;
                              color:white;text-decoration:none;font-size:16px;
                              font-weight:700;letter-spacing:0.2px;border-radius:12px;
                              white-space:nowrap;">
                      ${c.btn}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;">

              <!-- SECURITY NOTICE -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background:#f8fafc;border-radius:12px;padding:18px 20px;
                             border-left:3px solid ${c.color};">
                    <p style="color:#64748b;font-size:13px;margin:0 0 6px;font-weight:600;">
                      🔒 Aviso de seguridad
                    </p>
                    <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                      Este enlace expira en <strong style="color:#64748b">24 horas</strong>.
                      Si no solicitaste esto, ignorá este email — tu cuenta sigue segura.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- FALLBACK LINK -->
              <p style="color:#cbd5e1;font-size:11px;margin:20px 0 0;line-height:1.6;word-break:break-all;">
                Si el botón no funciona, copiá este enlace en tu navegador:<br>
                <span style="color:#93c5fd;">${confirmationUrl}</span>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;
                       border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">
                <strong style="color:#64748b;">AgencyAI</strong> · Sistema de gestión para agencias de marketing
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:0;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject: c.subject, html }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    const valid = await verifyWebhookSignature(request, rawBody)
    if (!valid) {
      console.error("[send-email-hook] 401 — firma inválida")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { user, email_data } = body as {
      user?: { email?: string }
      email_data?: {
        token_hash?: string
        email_action_type?: string
        site_url?: string
        redirect_to?: string
      }
    }

    if (!user?.email || !email_data?.token_hash) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const { token_hash, email_action_type, site_url, redirect_to } = email_data
    const actionType = email_action_type || "signup"
    const siteUrl    = site_url || "https://agencyai-iota.vercel.app"

    const confirmationUrl = buildConfirmationUrl(siteUrl, token_hash, actionType, redirect_to)
    const { subject, html } = getEmailContent(actionType, confirmationUrl, user.email)

    const transporter = getTransporter()
    await transporter.sendMail({
      from   : process.env.EMAIL_FROM || "AgencyAI <logisticaceoon@gmail.com>",
      to     : user.email,
      subject,
      html,
    })

    console.log(`[send-email-hook] ✅ Email "${actionType}" enviado a ${user.email}`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[send-email-hook] Error:", error)
    return NextResponse.json({ error: "Error enviando email" }, { status: 500 })
  }
}
