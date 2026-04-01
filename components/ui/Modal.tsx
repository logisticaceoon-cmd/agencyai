'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[560px] rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-scale-in',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-0">
            <div>
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-[var(--text-muted)] mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-2 px-6 pb-6">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
