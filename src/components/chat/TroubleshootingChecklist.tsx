"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const progress = (checkedSteps.size / steps.length) * 100;



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
    const stepDetails = steps.map((stepText, index) => ({
      stepNumber: index + 1,
      stepText,
      attempted: checkedSteps.has(`step-${index}`)
    }));
    
    onOutcome({
      type,
      sessionId,
      attemptedSteps,
      stepDetails
    });
  };

  const handleAnotherIssue = () => {
    setShowConfirmDialog(true);
  };

  const confirmAnotherIssue = () => {
    // Mark current session as abandoned and trigger new issue flow
    const attemptedSteps = Array.from(checkedSteps);
    const stepDetails = steps.map((stepText, index) => ({
      stepNumber: index + 1,
      stepText,
      attempted: checkedSteps.has(`step-${index}`)
    }));
    
    onOutcome({
      type: 'another_issue',
      sessionId,
      attemptedSteps,
      stepDetails
    });
    
    setShowConfirmDialog(false);
  };

  return (
    <div className="bg-[#F7F7F2] rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-red-600" />
          <h1 className="text-lg font-semibold text-gray-900">{guideTitle}</h1>
        </div>
        <Badge variant="secondary" className="bg-[#F5F5DC] text-gray-700 text-sm px-3 py-1">
          Active Issue
        </Badge>
      </div>

      <p className="text-gray-600 mb-6">Check each step as you attempt it, then choose an outcome below.</p>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>
            {checkedSteps.size}/{steps.length} steps completed
          </span>
        </div>
        <div className="w-full bg-[#E0BB5E] rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Checkbox
                id={`step-${index}`}
                checked={checkedSteps.has(`step-${index}`)}
                onCheckedChange={(checked) => handleStepCheck(index, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor={`step-${index}`} className="block font-medium text-gray-900 cursor-pointer leading-relaxed">
                  Step {index + 1}: {step}
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">How did the troubleshooting go?</h3>

        {checkedSteps.size === 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <p className="text-orange-800 text-sm">Please attempt at least one troubleshooting step before marking as resolved or not resolved</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button
            variant="outline"
            className="h-auto p-4 justify-start gap-3 border-gray-200 hover:bg-gray-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={checkedSteps.size === 0}
            onClick={() => handleOutcome('resolved')}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900">Resolved</div>
              <div className="text-xs text-gray-500">
                {checkedSteps.size === 0 ? 'Try at least one step first' : 'Issue is fixed'}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 justify-start gap-3 border-gray-200 hover:bg-gray-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={checkedSteps.size === 0}
            onClick={() => handleOutcome('not_resolved')}
          >
            <XCircle className="h-4 w-4 text-red-600" />
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900">Not Resolved</div>
              <div className="text-xs text-gray-500">
                {checkedSteps.size === 0 ? 'Try at least one step first' : 'Still having issues'}
              </div>
            </div>
          </Button>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full gap-2 border-gray-200 hover:bg-gray-50 bg-orange-100 text-orange-800 border-orange-200"
              onClick={handleAnotherIssue}
            >
              <RotateCcw className="h-4 w-4" />
              Different Issue - This Guide Doesn&apos;t Match
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Confirm Different Issue
              </DialogTitle>
              <DialogDescription className="text-left">
                Are you sure this troubleshooting guide doesn&apos;t match your issue? 
                {checkedSteps.size > 0 && (
                  <span className="block mt-2 text-sm text-gray-600">
                    Your progress on {checkedSteps.size} step{checkedSteps.size !== 1 ? 's' : ''} will be saved.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Continue This Guide
              </Button>
              <Button
                variant="destructive"
                onClick={confirmAnotherIssue}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Yes, Different Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        
      </div>
    </div>
  );
}
