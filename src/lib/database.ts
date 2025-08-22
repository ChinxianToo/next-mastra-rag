import { prisma } from './prisma';
import {
  CreateSessionData,
  UpdateSessionData,
  CreateStepData,
  CreateTicketData,
  TroubleshootingSession,
  TroubleshootingStep,
  Ticket,
  User
} from '@/types/conversation';

// User operations
export async function createUser(name: string, phoneNumber: string, email: string): Promise<User> {
  return prisma.user.create({
    data: {
      name,
      phoneNumber,
      email,
    },
  });
}

export async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

// Session operations
export async function createTroubleshootingSession(data: CreateSessionData): Promise<TroubleshootingSession> {
  // Ensure user exists or create hardcoded user for now
  let user = await getUser(data.userId);
  if (!user) {
    user = await createUser('Demo User', '+1234567890', 'demo@example.com');
  }

  return prisma.troubleshootingSession.create({
    data: {
      userId: user.id,
      issueDescription: data.issueDescription,
      matchedGuideTitle: data.matchedGuideTitle,
    },
    include: {
      user: true,
      steps: true,
      unresolvedTicket: true,
    },
  });
}

export async function getTroubleshootingSession(id: string): Promise<TroubleshootingSession | null> {
  return prisma.troubleshootingSession.findUnique({
    where: { id },
    include: {
      user: true,
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      unresolvedTicket: true,
    },
  });
}

export async function updateTroubleshootingSession(
  id: string,
  data: UpdateSessionData
): Promise<TroubleshootingSession> {
  return prisma.troubleshootingSession.update({
    where: { id },
    data,
    include: {
      user: true,
      steps: true,
      unresolvedTicket: true,
    },
  });
}

// Step operations
export async function createTroubleshootingStep(data: CreateStepData): Promise<TroubleshootingStep> {
  return prisma.troubleshootingStep.create({
    data,
  });
}

export async function createMultipleTroubleshootingSteps(
  sessionId: string,
  steps: Array<{
    stepNumber: number;
    stepText: string;
    attempted: boolean;
    resolvedIssue: boolean;
  }>
): Promise<TroubleshootingStep[]> {
  const stepData = steps.map(step => ({
    sessionId,
    ...step,
  }));

  return prisma.troubleshootingStep.createMany({
    data: stepData,
  }).then(() =>
    prisma.troubleshootingStep.findMany({
      where: { sessionId },
      orderBy: { stepNumber: 'asc' },
    })
  );
}

export async function updateTroubleshootingStep(
  id: string,
  data: Partial<Omit<TroubleshootingStep, 'id' | 'sessionId'>>
): Promise<TroubleshootingStep> {
  return prisma.troubleshootingStep.update({
    where: { id },
    data,
  });
}

// Ticket operations
export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  return prisma.ticket.create({
    data,
    include: {
      session: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function getTicket(id: string): Promise<Ticket | null> {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          user: true,
        },
      },
    },
  });
}


