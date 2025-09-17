'use client'

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-heading-1 text-foreground">{title}</h1>
        {description && <p className="text-body-large text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

