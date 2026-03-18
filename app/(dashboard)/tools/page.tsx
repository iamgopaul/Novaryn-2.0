import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code2, Terminal, FileText, Bookmark, ArrowRight } from 'lucide-react'

const toolsData = [
  {
    id: 'editor',
    name: 'Code Editor',
    description: 'Monaco-powered code editor with syntax highlighting, auto-completion, and theme support.',
    icon: Code2,
    href: '/tools/editor',
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Interactive terminal for running commands, scripts, and managing your development environment.',
    icon: Terminal,
    href: '/tools/terminal',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    id: 'docs',
    name: 'Documentation Generator',
    description: 'Automatically generate documentation from your code with AI-powered insights.',
    icon: FileText,
    href: '/tools/docs',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'snippets',
    name: 'Snippet Manager',
    description: 'Save, organize, and quickly access your favorite code snippets with tags and search.',
    icon: Bookmark,
    href: '/tools/snippets',
    color: 'bg-orange-500/10 text-orange-500',
  },
]

export default async function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Powerful development tools to boost your productivity
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {toolsData.map((tool) => (
          <Card key={tool.id} className="group transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tool.color}`}>
                  <tool.icon className="h-6 w-6" />
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={tool.href}>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
              <CardTitle className="mt-4">{tool.name}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={tool.href}>Open {tool.name}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
