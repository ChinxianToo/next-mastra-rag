"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistOutcome } from "@/types/conversation";
import { AlertTriangle, CheckCircle, XCircle, Monitor, RotateCcw } from "lucide-react";

interface TroubleshootingChecklistProps {
  guideTitle: string;
  steps: string[];
  sessionId: string;
  onOutcome: (outcome: ChecklistOutcome) => void;
}

export function TroubleshootingChecklist({
  guideTitle,
  steps,
  sessionId,
  onOutcome
}: TroubleshootingChecklistProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
  

  const progress = (checkedSteps.size / steps.length) * 100;

  // Extract meaningful step titles from the full step text
  const getStepTitle = (step: string) => {
    // Look for common patterns in step descriptions
    if (step.toLowerCase().includes('power') && step.toLowerCase().includes('cable')) {
      return 'Check Power Connections';
    }
    if (step.toLowerCase().includes('power cycle') || step.toLowerCase().includes('unplug')) {
      return 'Power Cycle the Monitor';
    }
    if (step.toLowerCase().includes('restart') || step.toLowerCase().includes('reboot')) {
      return 'Perform PC Restart';
    }
    if (step.toLowerCase().includes('usb')) {
      return 'Remove USB Devices';
    }
    if (step.toLowerCase().includes('ethernet') || step.toLowerCase().includes('cable')) {
      return 'Ensure the Ethernet cable...';
    }
    if (step.toLowerCase().includes('different') && step.toLowerCase().includes('cable')) {
      return 'If possible, try a...';
    }
    
    // Fallback: use first 4-5 words with ellipsis
    const words = step.split(' ');
    if (words.length <= 5) {
      return step;
    }
    return words.slice(0, 4).join(' ') + '...';
  };

  const handleStepCheck = (stepIndex: number, checked: boolean) => {
    const stepId = `step-${stepIndex}`;
    const newCheckedSteps = new Set(checkedSteps);
    
    if (checked) {
      newCheckedSteps.add(stepId);
    } else {
      newCheckedSteps.delete(stepId);
    }
    
    setCheckedSteps(newCheckedSteps);
  };

  const handleOutcome = (type: 'resolved' | 'not_resolved') => {
    const attemptedSteps = Array.from(checkedSteps);
    onOutcome({
      type,
      sessionId,
      attemptedSteps
    });
  };

  const handleAnotherIssue = () => {
    // Mark current session as abandoned and trigger new issue flow
    const attemptedSteps = Array.from(checkedSteps);
    onOutcome({
      type: 'another_issue',
      sessionId,
      attemptedSteps
    });
  };

  return (
    <Card className="mb-8 shadow-lg border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle className="font-heading font-bold text-xl">{guideTitle}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">
            Active Issue
          </Badge>
        </div>
        <CardDescription className="text-base">
          Check each step as you attempt it, then choose an outcome below.
        </CardDescription>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>
              {checkedSteps.size}/{steps.length} steps completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Troubleshooting Steps */}
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4 p-4 rounded-lg bg-card/50 border border-border/50">
            <Checkbox
              id={`step-${index}`}
              checked={checkedSteps.has(`step-${index}`)}
              onCheckedChange={(checked) => handleStepCheck(index, checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={`step-${index}`}
                className="block font-semibold text-foreground mb-2 cursor-pointer"
              >
                Step {index + 1}: {getStepTitle(step)}
              </label>
              <p className="text-muted-foreground leading-relaxed">{step}</p>
            </div>
          </div>
        ))}

        {/* Warning Message */}
        {checkedSteps.size === 0 && (
          <div className="flex items-center gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0" />
            <p className="text-accent-foreground font-medium">
              Please attempt at least one step before choosing an outcome
            </p>
          </div>
        )}

        {/* Outcome Section */}
        <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-4">How did the troubleshooting go?</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start gap-3 border-2 hover:border-primary hover:bg-primary/5 bg-transparent"
              disabled={checkedSteps.size === 0}
              onClick={() => handleOutcome('resolved')}
            >
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-semibold">Resolved</div>
                <div className="text-sm text-muted-foreground">Issue is fixed</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 justify-start gap-3 border-2 hover:border-destructive hover:bg-destructive/5 bg-transparent"
              disabled={checkedSteps.size === 0}
              onClick={() => handleOutcome('not_resolved')}
            >
              <XCircle className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <div className="font-semibold">Not Resolved</div>
                <div className="text-sm text-muted-foreground">Still having issues</div>
              </div>
            </Button>
          </div>

          <Button 
            variant="secondary" 
            className="w-full gap-2 mb-4" 
            disabled={checkedSteps.size === 0}
            onClick={handleAnotherIssue}
          >
            <RotateCcw className="h-4 w-4" />
            Another Issue
          </Button>

          {checkedSteps.size === 0 && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-accent-foreground text-sm font-medium">
                Please attempt at least one troubleshooting step before marking as resolved or not resolved.
              </p>
            </div>
          )}
        </div>


      </CardContent>
    </Card>
  );
}
