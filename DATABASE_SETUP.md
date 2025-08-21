# Database Integration Setup

This document explains how the troubleshooting system integrates with the PostgreSQL database to track user sessions, step attempts, and create support tickets.

## Database Schema

The system uses 4 main tables:

### 1. User
- `id` (UUID, Primary Key)
- `name` (String)
- `phoneNumber` (String)  
- `email` (String)
- `createdAt` (DateTime)

### 2. TroubleshootingSession
- `id` (UUID, Primary Key)
- `userId` (String, Foreign Key)
- `issueDescription` (String) - User's original problem description
- `matchedGuideTitle` (String) - Title of the troubleshooting guide used
- `resolved` (Boolean, default: false) - Whether the issue was resolved
- `earlyExit` (Boolean, default: false) - User left before completing
- `misclassified` (Boolean, default: false) - Guide didn't match the issue
- `abandoned` (Boolean, default: false) - User exited mid-flow
- `startedAt` (DateTime) - When the session began
- `completedAt` (DateTime, nullable) - When the session ended

### 3. TroubleshootingStep
- `id` (UUID, Primary Key)
- `sessionId` (String, Foreign Key)
- `stepNumber` (Integer) - Order of the step (1, 2, 3, etc.)
- `stepText` (String) - The actual troubleshooting instruction
- `attempted` (Boolean) - Whether the user checked this step
- `resolvedIssue` (Boolean) - Whether this step resolved the issue
- `respondedAt` (DateTime) - When the step was recorded

### 4. Ticket
- `id` (UUID, Primary Key)
- `sessionId` (String, Foreign Key, Unique)
- `matchedGuideTitle` (String) - Guide that was attempted
- `createdAt` (DateTime) - When the ticket was created

## Environment Setup

Create a `.env.local` file in the project root with:

```bash
# Database Configuration
DB_URL="postgresql://username:password@localhost:5432/troubleshooting_db"

# Memory Database (for Mastra - can be the same as DB_URL)
MEMORY_DB_URI="postgresql://username:password@localhost:5432/troubleshooting_db"
```

## Database Setup Commands

1. **Generate Prisma Client:**
   ```bash
   pnpm db:generate
   ```

2. **Run Database Migrations:**
   ```bash
   pnpm db:migrate
   ```

3. **Initialize Database with Demo Data:**
   ```bash
   pnpm db:init
   ```

4. **Deploy to Production:**
   ```bash
   pnpm db:deploy
   ```

5. **Open Database Studio:**
   ```bash
   pnpm db:studio
   ```

## Quick Start

1. Set up your PostgreSQL database
2. Copy environment variables from `.env.example` to `.env.local`
3. Update database URLs in `.env.local`
4. Run migrations: `pnpm db:migrate`
5. Initialize with demo data: `pnpm db:init`
6. Start the application: `pnpm dev`

## How It Works

### 1. Session Creation
When a user receives a troubleshooting checklist:
- A new `TroubleshootingSession` record is created
- Records the user's issue description and matched guide title
- If user doesn't exist, creates a demo user temporarily

### 2. Step Tracking
When the user completes the checklist:
- Individual `TroubleshootingStep` records are created for each step
- Records which steps were attempted and their outcomes
- Tracks the exact step text for analysis

### 3. Outcome Handling

**Resolved:**
- Session marked as `resolved = true`
- `completedAt` timestamp set
- All attempted steps marked with `resolvedIssue = true`

**Not Resolved:**
- Session marked as `resolved = false` 
- `completedAt` timestamp set
- A `Ticket` record is automatically created
- User gets ticket ID for reference

**Another Issue (Misclassified):**
- Session marked as `abandoned = true` and `misclassified = true`
- `completedAt` timestamp set
- User can start a new troubleshooting session

### 4. Analytics & Reporting

The system provides functions to analyze:
- Resolution rates
- Average steps to resolution
- Most problematic guides
- Unresolved sessions requiring follow-up

## Key Features

1. **Automatic User Management:** Creates demo users if needed
2. **Graceful Fallbacks:** Works even if database is unavailable
3. **Complete Session Tracking:** Records every step attempt and outcome
4. **Automatic Ticket Creation:** Generates support tickets for unresolved issues
5. **Analytics Ready:** Data structure supports detailed reporting

## Database Service Functions

Located in `src/lib/database.ts`:

- `createTroubleshootingSession()` - Start new session
- `updateTroubleshootingSession()` - Update session status
- `createMultipleTroubleshootingSteps()` - Record step attempts
- `createTicket()` - Generate support ticket
- `getSessionStats()` - Analytics and reporting

## Testing

The system includes fallback logic to handle:
- Database connection failures
- Missing sessions
- Invalid data formats

Users will still receive appropriate responses even if database operations fail.

## Analytics API

View collected data and statistics:

```bash
# Get troubleshooting analytics
curl http://localhost:3000/api/analytics
```

Returns:
- Total sessions and resolution rates
- Average steps to resolution
- List of unresolved sessions needing follow-up
- Ticket information for escalated issues

## Example Usage Flow

1. **User starts troubleshooting:** "My computer won't boot"
2. **System creates session:** Records issue description and matched guide
3. **User works through checklist:** Each step attempt is tracked
4. **User marks outcome:**
   - **Resolved:** Session closed, marked successful
   - **Not Resolved:** Ticket created, session flagged for follow-up
   - **Wrong Guide:** Session marked as misclassified

5. **Analytics:** Track patterns, identify problematic guides, follow up on tickets
