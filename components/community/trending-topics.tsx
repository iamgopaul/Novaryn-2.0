import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const trendingTopics = [
  { tag: '#TypeScript', posts: 1234 },
  { tag: '#NextJS', posts: 987 },
  { tag: '#React', posts: 876 },
  { tag: '#TailwindCSS', posts: 654 },
  { tag: '#Supabase', posts: 543 },
]

export function TrendingTopics() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Trending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trendingTopics.map((topic) => (
          <div
            key={topic.tag}
            className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted cursor-pointer"
          >
            <span className="font-medium text-primary">{topic.tag}</span>
            <span className="text-sm text-muted-foreground">
              {topic.posts.toLocaleString()} posts
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
