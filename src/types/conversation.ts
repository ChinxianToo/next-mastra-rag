// Conversation flow types for the troubleshooting system

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  createdAt: Date;
}

export interface TroubleshootingSession {
  id: string;
  userId: string;
  issueDescription: string;
  matchedGuideTitle: string;
  resolved: boolean;
  earlyExit: boolean;
  misclassified: boolean;
  abandoned: boolean;
  startedAt: Date;
  completedAt?: Date;
  currentStepNumber?: number;
  user?: User;
  steps?: TroubleshootingStep[];
  unresolvedTicket?: Ticket;
}

export interface TroubleshootingStep {
  id: string;
  sessionId: string;
  stepNumber: number;
  stepText: string;
  attempted: boolean;
  resolvedIssue: boolean;
  respondedAt: Date;
}

export interface Ticket {
  id: string;
  sessionId: string;
  matchedGuideTitle: string;
  createdAt: Date;
}

// Conversation flow state types
export type ConversationState = 
  | 'initial'           // First user message
  | 'scope_check'       // Checking if issue is in scope
  | 'guide_confirmation' // Confirming matched guide
  | 'presenting_step'   // Showing troubleshooting step
  | 'awaiting_response' // Waiting for user response to step
  | 'escalation'        // Creating ticket for unresolved issue
  | 'resolved'          // Issue resolved successfully
  | 'abandoned'         // User abandoned session

export type UserResponse = 
  | 'it_worked'
  | 'still_not_working'
  | 'cannot_try_now'
  | 'yes'
  | 'no';

export interface ConversationContext {
  sessionId?: string;
  userId?: string;
  state: ConversationState;
  currentStep?: number;
  totalSteps?: number;
  matchedGuides?: GuideMatch[];
  selectedGuide?: GuideMatch;
  awaitingResponseType?: 'step_result';
}

export interface GuideMatch {
  title: string;
  steps: string[];
  relevanceScore?: number;
  category?: string;
}

export interface StepResult {
  stepNumber: number;
  stepText: string;
  userResponse: UserResponse;
  resolved: boolean;
  timestamp: Date;
}

// Database operation interfaces
export interface CreateSessionData {
  userId: string;
  issueDescription: string;
  matchedGuideTitle: string;
}

export interface UpdateSessionData {
  resolved?: boolean;
  earlyExit?: boolean;
  misclassified?: boolean;
  abandoned?: boolean;
  completedAt?: Date;
  currentStepNumber?: number;
  matchedGuideTitle?: string;
}

export interface CreateStepData {
  sessionId: string;
  stepNumber: number;
  stepText: string;
  attempted: boolean;
  resolvedIssue: boolean;
}

export interface CreateTicketData {
  sessionId: string;
  matchedGuideTitle: string;
}

// Interactive checklist form types
export interface ChecklistStep {
  id: string;
  stepNumber: number;
  stepText: string;
  attempted: boolean;
}

export interface ChecklistForm {
  id: string;
  sessionId: string;
  guideTitle: string;
  steps: ChecklistStep[];
  canResolve: boolean; // true when at least one step is attempted
}

export interface ChecklistOutcome {
  type: 'resolved' | 'not_resolved' | 'another_issue';
  sessionId: string;
  attemptedSteps: string[]; // IDs of attempted steps
}

export interface TroubleshootingGuideResponse {
  type: 'checklist';
  guideTitle: string;
  steps: string[];
  sessionId: string;
}
