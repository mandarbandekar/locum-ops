import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface Question {
  text: string;
  options: { label: string; score: number }[];
}

const questions: Question[] = [
  {
    text: 'How do you track facility contacts + rates today?',
    options: [
      { label: 'Sheets', score: 3 }, { label: 'Notes', score: 2 },
      { label: 'Memory', score: 3 }, { label: 'Other', score: 1 },
    ],
  },
  {
    text: 'How do you confirm shifts each month?',
    options: [
      { label: 'Email manually', score: 3 }, { label: 'Text', score: 2 },
      { label: "I don't", score: 4 }, { label: 'Other', score: 1 },
    ],
  },
  {
    text: 'Invoices: how do you track sent/paid?',
    options: [
      { label: 'Sheets', score: 3 }, { label: 'QuickBooks', score: 1 },
      { label: "I don't track", score: 4 }, { label: 'Other', score: 1 },
    ],
  },
  {
    text: 'Average invoices per month?',
    options: [
      { label: '1–3', score: 1 }, { label: '4–10', score: 2 }, { label: '11+', score: 3 },
    ],
  },
  {
    text: 'Biggest pain:',
    options: [
      { label: 'Confirmations', score: 2 }, { label: 'Invoicing', score: 2 },
      { label: 'Payment delays', score: 2 }, { label: 'Double booking', score: 2 },
      { label: 'Rate tracking', score: 2 },
    ],
  },
];

export default function QuizPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));

  const select = (qi: number, oi: number) => {
    const next = [...answers];
    next[qi] = oi;
    setAnswers(next);
  };

  const submit = () => {
    const score = answers.reduce((sum, oi, qi) => {
      if (oi === null) return sum;
      return sum + questions[qi].options[oi].score;
    }, 0);
    const answerLabels = answers.map((oi, qi) => oi !== null ? questions[qi].options[oi].label : null);
    localStorage.setItem('locumops_quiz', JSON.stringify({ answers: answerLabels, score, timestamp: new Date().toISOString() }));
    console.log('quiz_submit', { answers: answerLabels, score });
    navigate('/results');
  };

  const q = questions[current];
  const progress = ((current + (answers[current] !== null ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-bold text-lg text-foreground tracking-tight">LocumOps</Link>
          <div />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-foreground mb-1">Is LocumOps a fit for you?</h1>
        <p className="text-muted-foreground text-sm mb-8">60 seconds.</p>

        <Progress value={progress} className="mb-8 h-2" />

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <Card>
              <CardContent className="pt-6">
                <p className="font-medium text-foreground mb-1 text-sm">Question {current + 1} of {questions.length}</p>
                <p className="text-foreground mb-5">{q.text}</p>
                <RadioGroup value={answers[current] !== null ? String(answers[current]) : ''} onValueChange={v => select(current, Number(v))} className="space-y-2">
                  {q.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={String(i)} id={`q${current}-o${i}`} />
                      <Label htmlFor={`q${current}-o${i}`} className="flex-1 cursor-pointer text-sm">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {current < questions.length - 1 ? (
            <Button disabled={answers[current] === null} onClick={() => setCurrent(c => c + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button disabled={answers[current] === null} onClick={submit}>
              See results <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
