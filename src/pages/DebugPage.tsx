import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [quizEntries, setQuizEntries] = useState<any[]>([]);

  useEffect(() => {
    setWaitlist(JSON.parse(localStorage.getItem('locumops_waitlist') || '[]'));
    const quiz = localStorage.getItem('locumops_quiz');
    setQuizEntries(quiz ? [JSON.parse(quiz)] : []);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-bold text-lg text-foreground tracking-tight">LocumOps</Link>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Debug Panel</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Waitlist Submissions ({waitlist.length})</h2>
          {waitlist.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
          <div className="space-y-3">
            {waitlist.map((entry, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">{JSON.stringify(entry, null, 2)}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Quiz Entries ({quizEntries.length})</h2>
          {quizEntries.length === 0 && <p className="text-sm text-muted-foreground">No quiz entries yet.</p>}
          <div className="space-y-3">
            {quizEntries.map((entry, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <pre className="text-xs text-foreground whitespace-pre-wrap">{JSON.stringify(entry, null, 2)}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button variant="destructive" size="sm" onClick={() => {
          localStorage.removeItem('locumops_waitlist');
          localStorage.removeItem('locumops_quiz');
          setWaitlist([]);
          setQuizEntries([]);
        }}>
          Clear all data
        </Button>
      </div>
    </div>
  );
}
