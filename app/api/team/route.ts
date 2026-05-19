import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import nodemailer from 'nodemailer'
import { FOUNDER_WORKSPACE_IDS, PLAN_MAP } from '@/lib/plans'

// ─── Email helper (internal, no API key needed) ────────────────────────────
async function sendInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  inviteUrl,
}: {
  to: string
  inviterName: string
  workspaceName: string
  role: string
  inviteUrl: string
}) {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    trafficker: 'Trafficker',
    viewer: 'Viewer',
    owner: 'Owner',
  }
  const roleLabel = roleLabels[role] || role

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px;">
          <div style="background: #2563eb; border-radius: 10px; width: 36px; height: 36px; display: inline-block; line-height: 36px; text-align: center;">
            <span style="color: white; font-size: 18px;">⚡</span>
          </div>
          <span style="font-size: 20px; font-weight: 700; color: #0f172a;">AgencyAI</span>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Te invitaron a unirte</h1>
        <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">
          <strong>${inviterName}</strong> te invitó a unirte a <strong>${workspaceName}</strong> como <strong>${roleLabel}</strong>.
        </p>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Tu rol en el workspace</p>
          <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #0f172a;">${roleLabel}</p>
        </div>

        <a href="${inviteUrl}"
           style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none;">
          Aceptar invitación →
        </a>

        <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
          Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este email.
        </p>
      </div>

      <p style="text-align: center; font-size: 11px; color: #cbd5e1; margin-top: 24px;">
        AgencyAI · Plataforma de gestión para agencias digitales
      </p>
    </div>
  `

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('[team/invite] GMAIL_APP_PASSWORD no configurado — email no enviado')
    return { skipped: true }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'logisticaceoon@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const fromAddress = process.env.EMAIL_FROM || 'AgencyAI <logisticaceoon@gmail.com>'
  await transporter.sendMail({ from: fromAddress, to, subject: `Invitación a ${workspaceName} en AgencyAI`, html })
  return { sent: true }
}

// ─── GET — listar miembros e invitaciones pendientes ───────────────────────
export async function GET() {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Incluir invitaciones pendientes (no aceptadas)
  const adminClient = createAdminClient()
  const { data: pendingInvites } = await adminClient
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ data, pendingInvites: pendingInvites || [] })
}

// ─── POST — crear invitación con token real ────────────────────────────────
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, role, userId } = auth

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos para invitar' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, role: invitedRole = 'trafficker', name } = body

    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    // ─── Verificar límite de miembros según el plan ──────────────────────────
    if (!FOUNDER_WORKSPACE_IDS.has(workspaceId)) {
      const adminClient = createAdminClient()

      // Obtener el plan del workspace
      const { data: ws } = await adminClient
        .from('workspaces')
        .select('plan')
        .eq('id', workspaceId)
        .single()

      const plan = ws?.plan || 'free'
      const planDef = PLAN_MAP[plan as keyof typeof PLAN_MAP] ?? PLAN_MAP.free
      const maxUsers = planDef.maxUsers

      if (maxUsers !== Infinity) {
        // Contar miembros activos actuales
        const { count } = await adminClient
          .from('workspace_members')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')

        if ((count ?? 0) >= maxUsers) {
          const planNames: Record<string, string> = {
            free: 'Free (owner + 1)',
            pro: 'Pro (owner + 3)',
            agency: 'Agency (owner + 10)',
          }
          return NextResponse.json({
            error: `Límite de usuarios alcanzado. Tu plan ${planNames[plan] || plan} permite máximo ${maxUsers} miembros. Actualizá tu plan para agregar más.`,
            limitReached: true,
            maxUsers,
          }, { status: 403 })
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const adminClient = createAdminClient()

    // Verificar si ya es miembro activo
    const { data: existingMember } = await adminClient
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .single()

    if (existingMember && existingMember.status === 'active') {
      return NextResponse.json({ error: 'Este email ya es miembro activo del workspace' }, { status: 409 })
    }

    // Verificar si ya tiene invitación pendiente
    const { data: existingInvite } = await adminClient
      .from('workspace_invitations')
      .select('id, token')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      // Re-usar el token existente y re-enviar email
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://agencyai-iota.vercel.app'}/invite/${existingInvite.token}`

      // Obtener nombre del workspace e invitador
      const { data: ws } = await adminClient.from('workspaces').select('name').eq('id', workspaceId).single()
      const { data: inviter } = await supabase.from('workspace_members').select('name').eq('workspace_id', workspaceId).eq('user_id', userId).single()

      // Asegurar que el miembro existe en workspace_members como 'invited'
      const { data: existingMemberInvited } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .eq('status', 'invited')
        .single()

      if (!existingMemberInvited) {
        await adminClient.from('workspace_members').insert({
          workspace_id: workspaceId,
          email,
          name: name || email.split('@')[0],
          role: invitedRole,
          status: 'invited',
          user_id: `invited_${existingInvite.token}`,
        })
      }

      await sendInviteEmail({
        to: email,
        inviterName: inviter?.name || 'El equipo',
        workspaceName: ws?.name || 'tu agencia',
        role: invitedRole,
        inviteUrl,
      })

      return NextResponse.json({
        data: existingInvite,
        inviteUrl,
        message: 'Invitación re-enviada',
      })
    }

    // Generar token único
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días

    // Insertar en workspace_invitations
    const { data: invitation, error: inviteError } = await adminClient
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email,
        role: invitedRole,
        token,
        invited_by: userId,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('[team/invite] Error creando invitación:', inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Registrar en workspace_members con status 'invited' para mostrar en lista
    // Intentar INSERT — si ya existe con ese email, ignorar el error de duplicado
    const { error: memberError } = await adminClient.from('workspace_members').insert({
      workspace_id: workspaceId,
      email,
      name: name || email.split('@')[0],
      role: invitedRole,
      status: 'invited',
      user_id: `invited_${token}`,
    })
    if (memberError && !memberError.message?.includes('duplicate') && !memberError.code?.includes('23505')) {
      console.warn('[team/invite] workspace_members insert warn:', memberError.message)
    }

    // Obtener datos para el email
    const { data: ws } = await adminClient.from('workspaces').select('name').eq('id', workspaceId).single()
    const { data: inviter } = await supabase.from('workspace_members').select('name').eq('workspace_id', workspaceId).eq('user_id', userId).single()

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://agencyai-iota.vercel.app'}/invite/${token}`

    // Enviar email de invitación
    const emailResult = await sendInviteEmail({
      to: email,
      inviterName: inviter?.name || 'El equipo',
      workspaceName: ws?.name || 'tu agencia',
      role: invitedRole,
      inviteUrl,
    })

    return NextResponse.json({
      data: invitation,
      inviteUrl,
      emailSent: !emailResult.skipped,
      message: emailResult.skipped
        ? 'Invitación creada (email no enviado — configurar GMAIL_APP_PASSWORD)'
        : `Invitación enviada a ${email}`,
    }, { status: 201 })
  } catch (err) {
    console.error('[team/invite] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
