import { useLocation } from 'react-router-dom'

export function Placeholder() {
  const path = useLocation().pathname
  const name = path.slice(1).split('/').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{name || 'Page'}</h1>
      <p className="text-muted-foreground">This page is available in the Vite app. Content can be migrated from the original Next.js app as needed.</p>
    </div>
  )
}
