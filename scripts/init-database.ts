#!/usr/bin/env tsx

/**
 * Database initialization script
 * This script helps set up the initial database and creates a demo user
 */

import { prisma } from '../src/lib/prisma';
import { createUser } from '../src/lib/database';

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if demo user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'demo@example.com' }
    });

    if (!existingUser) {
      // Create demo user
      const demoUser = await createUser(
        'Demo User',
        '+1-234-567-8900', 
        'demo@example.com'
      );
      console.log('✅ Demo user created:', demoUser.id);
    } else {
      console.log('✅ Demo user already exists:', existingUser.id);
    }

    // Display some stats
    const stats = await prisma.user.count();
    console.log(`📊 Total users in database: ${stats}`);

    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeDatabase();
