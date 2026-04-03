import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react';
import {
  ASSESSMENT_QUESTIONS,
  scoreAssessment,
  calculateSavingsEstimate,
  FIT_RESULT_CONFIG,
  type AssessmentAnswers,
  type AssessmentResult,
  type FitResult,
} from '@/lib/scorpAssessment';
import SCorpPlaybook from './SCorpPlaybook';

interface Props {
  savedResult: AssessmentResult | null;
  onSaveResult: (result: AssessmentResult) => Promise<void>;
  onSaveQuestion: (q: string, topic: string) => Promise<void>;
}

export default function SCorpAssessmentTab({ savedResult, onSaveResult, onSaveQuestion }: Props) {
  const [step, setStep] = useState(savedResult ? -1 : 0); // -1 = show results
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>(savedResult?.answers || {});
  const [result, setResult] = useState<AssessmentResult | null>(savedResult);

  const totalSteps = ASSESSMENT_QUESTIONS.length;
  const currentQ = step >= 0 && step < totalSteps ? ASSESSMENT_QUESTIONS[step] : null;
  const currentAnswer = currentQ ? answers[currentQ.key] : undefined;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      // Complete
      const a = answers as AssessmentAnswers;
      const fitResult = scoreAssessment(a);
      const savings = calculateSavingsEstimate(a.incomeRange);
      const res: AssessmentResult = {
        answers: a,
        result: fitResult,
        savingsEstimate: savings,
        completedAt: new Date().toISOString(),
      };
      setResult(res);
      setStep(-1);
      onSaveResult(res);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setStep(0);
  };

  // Show results
  if (step === -1 && result) {
    const config = FIT_RESULT_CONFIG[result.result];
    return (
      <div className="space-y-6">
        {/* Result card */}
        <Card className={`border-2 ${config.color}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{config.label}</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRetake}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Retake
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{config.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings estimate */}
        {result.savingsEstimate && (
          <Card className="border bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Educational Savings Estimate</h4>
                  <p className="text-2xl font-bold text-primary">
                    ${result.savingsEstimate.low.toLocaleString()} – ${result.savingsEstimate.high.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground"> / year</span>
                  </p>
                  <div className="flex items-start gap-1.5 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This is an educational estimate based on common SE tax differences for your income range.
                      Actual results depend on reasonable compensation, state rules, and your full tax situation.
                      <strong className="text-foreground"> Discuss with your CPA before making any decisions.</strong>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Playbook */}
        <SCorpPlaybook onSaveQuestion={onSaveQuestion} />
      </div>
    );
  }

  // Show quiz
  return (
    <div className="space-y-6">
      {/* Intro */}
      {step === 0 && (
        <Card className="border bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-1">S-Corp Fit Assessment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Answer 6 quick questions to see if an S-Corp structure is worth discussing with your CPA.
              This is an educational tool — not tax advice.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {step + 1} of {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / totalSteps) * 100} className="h-1.5" />
      </div>

      {/* Question */}
      {currentQ && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{currentQ.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={currentAnswer || ''}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, [currentQ.key]: v }))}
              className="space-y-3"
            >
              {currentQ.options.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentAnswer === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!currentAnswer}
              >
                {step === totalSteps - 1 ? 'See Results' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
