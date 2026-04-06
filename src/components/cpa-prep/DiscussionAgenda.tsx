import { MessageSquare } from 'lucide-react';

interface Props { topics: string[] }

export default function DiscussionAgenda({ topics }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Suggested topics based on your data — bring these up at your next CPA meeting.</p>
      <ul className="space-y-2">
        {topics.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
