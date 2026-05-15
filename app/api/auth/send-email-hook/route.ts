import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'logisticaceoon@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function buildConfirmationUrl(siteUrl: string, tokenHash: string, type: string, redirectTo?: string) {
  const base = siteUrl.replace(/\/$/, '')
  let url = `${base}/auth/confirm?token_hash=${tokenHash}&type=${type}`
  if (redirectTo) url += `&next=${encodeURIComponent(redirectTo)}`
  return url
}

function getEmailContent(type: string, confirmationUrl: string, userEmail: string) {
  const subjects: Record<string, string> = {
    signup: 'Confirmá tu cuenta — AgencyAI',
    recovery: 'Recuperar contraseña — AgencyAI',
    invite: 'Te invitaron a AgencyAI',
    magiclink: 'Tu link de acceso — AgencyAI',
  }
  const labels: Record<string, string> = {
    signup: 'Confirmar mi cuenta',
    recovery: 'Restablecer contraseña',
    invite: 'Aceptar invitación',
    magiclink: 'Iniciar sesión',
  }
  const subject = subjects[type] || subjects['signup']
  const btnLabel = labels[type] || labels['signup']
  const intro = type === 'recovery'
    ? `Recibimos una solicitud para restablecer la contraseña de <strong>${userEmail}</strong>.`
    : 'Hacé click en el botón para continuar.'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#2563eb;text-align:center;">⚡ AgencyAI</h1>
      <h2 style="color:#1e293b;">${subject}</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;">${intro}</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${confirmationUrl}" style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">${btnLabel}</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">Este enlace expira en 24 horas. Si no solicitaste esto, ignorá este email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:11px;text-align:center;">AgencyAI — Sistema de gestión para agencias de marketing</p>
    </div>`
  return { subject, html }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user, email_data } = body
    if (!user?.email || !email_data) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
    const { token_hash, email_action_type, site_url, redirect_to } = email_data
    const actionType = email_action_type || 'signup'
    const siteUrl = site_url || 'https://agencyai-iota.vercel.app'
    const confirmationUrl = buildConfirmationUrl(siteUrl, token_hash, actionType, redirect_to)
    const { subject, html } = getEmailContent(actionType, confirmationUrl, user.email)
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'AgencyAI <logisticaceoon@gmail.com>',
      to: user.email,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auth hook email error:', error)
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
