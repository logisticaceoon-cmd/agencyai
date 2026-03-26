import { prisma } from './prisma'
import { NotificationType, Priority } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: NotificationType
  priority?: Priority
  relatedEntityType?: string
  relatedEntityId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority ?? 'medium',
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      deliveryMethods: ['in_app'],
    },
  })
}

export async function createNotificationForMultiple(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority ?? 'medium',
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      deliveryMethods: ['in_app'],
    })),
  })
}

export async function notifyTaskAssigned(taskId: string, taskTitle: string, assignedUserIds: string[]) {
  await createNotificationForMultiple(assignedUserIds, {
    title: 'Nueva tarea asignada',
    message: `Se te asignó la tarea: ${taskTitle}`,
    type: 'task',
    relatedEntityType: 'task',
    relatedEntityId: taskId,
  })
}

export async function notifyTaskCompleted(taskId: string, taskTitle: string, ceoIds: string[], completedByName: string) {
  await createNotificationForMultiple(ceoIds, {
    title: 'Tarea completada',
    message: `${completedByName} completó: ${taskTitle}`,
    type: 'task',
    relatedEntityType: 'task',
    relatedEntityId: taskId,
  })
}

export async function notifyTaskValidated(taskId: string, taskTitle: string, assignedUserIds: string[]) {
  await createNotificationForMultiple(assignedUserIds, {
    title: 'Tarea validada ✅',
    message: `Tu tarea fue validada: ${taskTitle}`,
    type: 'task',
    priority: 'low',
    relatedEntityType: 'task',
    relatedEntityId: taskId,
  })
}

export async function notifyReportSubmitted(reportId: string, reportTitle: string, ceoIds: string[], submittedByName: string) {
  await createNotificationForMultiple(ceoIds, {
    title: 'Nuevo reporte',
    message: `${submittedByName} subió un reporte: ${reportTitle}`,
    type: 'report',
    relatedEntityType: 'report',
    relatedEntityId: reportId,
  })
}
