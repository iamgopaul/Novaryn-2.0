'use client'

import Link from 'next/link'
import { Project } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react'

interface ProjectHealthCardProps {
  project: Project
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  design: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  development: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  testing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  review: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  deployment: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  archived: 'bg-muted text-muted-foreground border-muted',
}

const healthIcons = {
  healthy: CheckCircle2,
  at_risk: AlertTriangle,
  critical: XCircle,
}

const healthColors = {
  healthy: 'text-green-500',
  at_risk: 'text-yellow-500',
  critical: 'text-red-500',
}

export function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const HealthIcon = healthIcons[project.health]
  const updatedAt = new Date(project.updated_at)

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <div className={cn('rounded-full p-1', healthColors[project.health])}>
          <HealthIcon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium group-hover:text-primary transition-colors">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('capitalize', statusColors[project.status])}>
          {project.status.replace('_', ' ')}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}
