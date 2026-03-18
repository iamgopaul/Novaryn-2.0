'use client'

import { cn } from '@/lib/utils'
import { 
  Lightbulb, 
  Palette, 
  Code2, 
  TestTube, 
  Eye, 
  Rocket, 
  CheckCircle2 
} from 'lucide-react'

interface SDLCPipelineProps {
  statusCounts: {
    planning: number
    design: number
    development: number
    testing: number
    review: number
    deployment: number
    completed: number
  }
}

const stages = [
  { key: 'planning', label: 'Planning', icon: Lightbulb, color: 'bg-blue-500' },
  { key: 'design', label: 'Design', icon: Palette, color: 'bg-purple-500' },
  { key: 'development', label: 'Development', icon: Code2, color: 'bg-cyan-500' },
  { key: 'testing', label: 'Testing', icon: TestTube, color: 'bg-yellow-500' },
  { key: 'review', label: 'Review', icon: Eye, color: 'bg-orange-500' },
  { key: 'deployment', label: 'Deployment', icon: Rocket, color: 'bg-pink-500' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-500' },
] as const

export function SDLCPipeline({ statusCounts }: SDLCPipelineProps) {
  const totalProjects = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Pipeline visualization */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {stages.map((stage, index) => {
          const count = statusCounts[stage.key]
          const percentage = totalProjects > 0 ? (count / totalProjects) * 100 : 0
          
          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center min-w-[100px]">
              {/* Stage icon and count */}
              <div className="relative mb-2">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                    count > 0 ? stage.color : 'bg-muted'
                  )}
                >
                  <stage.icon
                    className={cn(
                      'h-6 w-6',
                      count > 0 ? 'text-white' : 'text-muted-foreground'
                    )}
                  />
                </div>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                    {count}
                  </span>
                )}
              </div>

              {/* Stage label */}
              <span className="text-xs font-medium text-center">{stage.label}</span>

              {/* Progress indicator */}
              {index < stages.length - 1 && (
                <div className="absolute hidden lg:block" style={{ left: '50%', transform: 'translateX(50%)' }}>
                  <div className="h-0.5 w-full bg-border" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {stages.map((stage) => {
            const count = statusCounts[stage.key]
            const percentage = totalProjects > 0 ? (count / totalProjects) * 100 : 0
            
            if (percentage === 0) return null
            
            return (
              <div
                key={stage.key}
                className={cn('h-full transition-all', stage.color)}
                style={{ width: `${percentage}%` }}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          {stages.map((stage) => {
            const count = statusCounts[stage.key]
            if (count === 0) return null
            
            return (
              <div key={stage.key} className="flex items-center gap-1.5">
                <div className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
                <span className="text-muted-foreground">
                  {stage.label}: {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
