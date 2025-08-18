// Database service layer for conversation flow management
import { 
  TroubleshootingSession, 
  TroubleshootingStep, 
  Ticket, 
  User,
  CreateSessionData,
  UpdateSessionData,
  CreateStepData,
  CreateTicketData
} from '@/types/conversation';

// Mock database implementation - replace with actual Prisma client
// This simulates the database operations until Prisma is fully configured

class DatabaseService {
  private sessions: Map<string, TroubleshootingSession> = new Map();
  private steps: Map<string, TroubleshootingStep[]> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private users: Map<string, User> = new Map();

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...userData,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  // Session operations
  async createSession(data: CreateSessionData): Promise<TroubleshootingSession> {
    const session: TroubleshootingSession = {
      id: this.generateId(),
      ...data,
      resolved: false,
      earlyExit: false,
      misclassified: false,
      abandoned: false,
      startedAt: new Date(),
      currentStepNumber: 0
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSessionById(id: string): Promise<TroubleshootingSession | null> {
    return this.sessions.get(id) || null;
  }

  async updateSession(id: string, data: UpdateSessionData): Promise<TroubleshootingSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    const updatedSession = { ...session, ...data };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveSessionByUserId(userId: string): Promise<TroubleshootingSession | null> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.resolved && !session.abandoned && !session.earlyExit) {
        return session;
      }
    }
    return null;
  }

  // Step operations
  async createStep(data: CreateStepData): Promise<TroubleshootingStep> {
    const step: TroubleshootingStep = {
      id: this.generateId(),
      ...data,
      respondedAt: new Date()
    };

    const sessionSteps = this.steps.get(data.sessionId) || [];
    sessionSteps.push(step);
    this.steps.set(data.sessionId, sessionSteps);

    return step;
  }

  async getStepsBySessionId(sessionId: string): Promise<TroubleshootingStep[]> {
    return this.steps.get(sessionId) || [];
  }

  async getLastStepBySessionId(sessionId: string): Promise<TroubleshootingStep | null> {
    const steps = this.steps.get(sessionId) || [];
    return steps.length > 0 ? steps[steps.length - 1] : null;
  }

  // Ticket operations
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const ticket: Ticket = {
      id: this.generateId(),
      ...data,
      createdAt: new Date()
    };
    this.tickets.set(ticket.sessionId, ticket);
    return ticket;
  }

  async getTicketBySessionId(sessionId: string): Promise<Ticket | null> {
    return this.tickets.get(sessionId) || null;
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Analytics methods
  async getSessionStats() {
    const allSessions = Array.from(this.sessions.values());
    return {
      total: allSessions.length,
      resolved: allSessions.filter(s => s.resolved).length,
      escalated: allSessions.filter(s => this.tickets.has(s.id)).length,
      abandoned: allSessions.filter(s => s.abandoned).length,
      misclassified: allSessions.filter(s => s.misclassified).length
    };
  }
}

// Export singleton instance
export const dbService = new DatabaseService();
