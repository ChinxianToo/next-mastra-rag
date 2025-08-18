# Troubleshooting Conversation Flow Implementation

## Overview

This implementation provides a structured 8-step conversation flow for IT helpdesk troubleshooting, removing the "Not Sure" option as requested and implementing Yes/No guide confirmations.

## Key Features

### 1. Structured Conversation Flow
- **Initial Problem Detection**: Scope checking for hardware issues
- **Guide Matching**: Vector search to find relevant troubleshooting guides
- **Guide Confirmation**: Yes/No options (no "Not Sure")
- **Step-by-Step Process**: Present one troubleshooting step at a time
- **User Response Handling**: "It worked", "Still not working", "Cannot try now"
- **Escalation**: Automatic ticket creation when all steps are exhausted

### 2. Session Management
- **Persistent Sessions**: Track user progress through database
- **State Management**: Maintain conversation state across interactions
- **Step Tracking**: Record attempts and outcomes for each step
- **Resume Capability**: Users can continue where they left off

### 3. Database Integration
- **Session Storage**: Track troubleshooting sessions
- **Step Recording**: Log each troubleshooting attempt
- **Ticket Creation**: Generate support tickets for unresolved issues
- **User Management**: Simple user identification for session tracking

## Implementation Components

### Core Files Created

1. **Types** (`src/types/conversation.ts`)
   - Conversation flow state definitions
   - Database entity interfaces
   - Response type definitions

2. **Database Service** (`src/services/database.ts`)
   - Mock database implementation (ready for Prisma integration)
   - Session, step, and ticket management
   - User tracking

3. **Conversation Flow Manager** (`src/services/conversationFlow.ts`)
   - Main state machine handling the 8-step process
   - Scope checking and guide matching
   - Step progression and response handling

4. **Conversation Flow Tool** (`src/mastra/tools/conversationFlowTool.ts`)
   - Mastra tool integration
   - Bridge between agent and flow manager
   - Context management

5. **Enhanced Agent** (`src/mastra/agents/Agent.ts`)
   - Updated prompt for conversation flow
   - Tool integration
   - Structured response handling

6. **API Enhancement** (`src/app/api/chat/route.ts`)
   - Conversation flow support
   - Session context passing
   - Response type handling

7. **Frontend Updates** (`src/components/chat/ChatInterface.tsx`)
   - Response buttons for guide confirmation and step responses
   - Dynamic UI based on conversation state
   - User ID generation and session tracking

## Conversation Flow Diagram

```
User Message
    ↓
Scope Check (Hardware vs Non-Hardware)
    ↓
Vector Search → Guide Matching
    ↓
Guide Confirmation (Yes/No)
    ├── Yes → Step 1
    └── No → Alternative Guides
    ↓
Present Step N
    ↓
User Response
    ├── "It worked" → Mark Resolved → END
    ├── "Still not working" → Next Step
    └── "Cannot try now" → Mark Abandoned
    ↓
Repeat until:
- Problem resolved
- All steps exhausted → Create Ticket
- User abandons session
```

## Response Options (Removed "Not Sure")

### Guide Confirmation
- **Yes**: Proceed with the matched guide
- **No**: Show alternative guides or restart

### Step Responses
- **It worked**: Mark session as resolved
- **Still not working**: Continue to next step
- **Cannot try now**: Mark session as abandoned

## Database Schema

Based on the provided schema with these entities:
- `User`: User identification and contact info
- `TroubleshootingSession`: Session state and progress
- `TroubleshootingStep`: Individual step attempts and outcomes
- `Ticket`: Escalation records for unresolved issues

## Usage

1. **User starts conversation**: "My monitor is not displaying anything"
2. **Agent performs scope check**: Determines it's a hardware issue
3. **Vector search**: Finds relevant troubleshooting guides
4. **Guide confirmation**: "I think this guide matches: Monitor – No Display. Does this sound right? Reply: Yes or No"
5. **User confirms**: "Yes"
6. **Step presentation**: "Step 1: Check the monitor's power connection... Reply: It worked, Still not working, or Cannot try now"
7. **Continue until resolved or escalated**

## Features Implemented

✅ 8-step conversation flow  
✅ Removed "Not Sure" option  
✅ Yes/No guide confirmation only  
✅ Session state management  
✅ Database integration (mock)  
✅ Step-by-step progression  
✅ Response buttons in UI  
✅ Escalation to tickets  
✅ Session resume capability  
✅ Scope checking  
✅ Vector search integration  

## Next Steps

1. **Database Integration**: Replace mock database with actual Prisma client
2. **Vector Search Enhancement**: Integrate with actual knowledge base
3. **Testing**: End-to-end testing of conversation flows
4. **Analytics**: Add reporting and analytics capabilities
5. **Performance**: Optimize for larger scale deployments

## Configuration

The system uses the existing database connection:
```
DB_URL=postgresql://postgres:postgres@10.1.2.153:5432/hmp_db
```

And maintains compatibility with the existing Mastra setup while adding the structured conversation flow capabilities.
