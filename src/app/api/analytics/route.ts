import { getSessionStats, getUnresolvedSessions } from '@/lib/database';

export async function GET() {
  try {
    // Get basic session statistics
    const stats = await getSessionStats();
    
    // Get list of unresolved sessions for follow-up
    const unresolvedSessions = await getUnresolvedSessions();
    
    // Calculate success rate
    const successRate = stats.total > 0 ? (stats.resolved / stats.total * 100).toFixed(1) : '0';
    
    return Response.json({
      summary: {
        totalSessions: stats.total,
        resolvedSessions: stats.resolved,
        unresolvedSessions: stats.unresolved,
        abandonedSessions: stats.abandoned,
        successRate: `${successRate}%`,
        averageStepsToResolution: stats.averageStepsToResolution,
      },
      unresolvedSessions: unresolvedSessions.map(session => ({
        id: session.id,
        userEmail: session.user?.email || 'Unknown',
        issueDescription: session.issueDescription,
        matchedGuideTitle: session.matchedGuideTitle,
        startedAt: session.startedAt,
        stepsAttempted: session.steps?.length || 0,
        hasTicket: !!session.unresolvedTicket,
        ticketId: session.unresolvedTicket?.id || null,
      })),
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return Response.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
