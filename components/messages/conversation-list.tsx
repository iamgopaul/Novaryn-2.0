'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  partner: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  }
  unreadCount: number
}

interface ConversationListProps {
  conversations: Conversation[]
  currentUserId: string
}

export function ConversationList({ conversations, currentUserId }: ConversationListProps) {
  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Link
          key={conv.partner.id}
          href={`/messages/${conv.partner.id}`}
          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <Avatar>
            <AvatarImage src={conv.partner.avatar_url || undefined} />
            <AvatarFallback>
              {conv.partner.display_name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {conv.partner.display_name || 'Unknown User'}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {conv.lastMessage.sender_id === currentUserId ? 'You: ' : ''}
              {conv.lastMessage.content}
            </p>
          </div>
          {conv.unreadCount > 0 && (
            <Badge className="ml-2">{conv.unreadCount}</Badge>
          )}
        </Link>
      ))}
    </div>
  )
}
