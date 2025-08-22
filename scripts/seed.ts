#!/usr/bin/env tsx

/**
 * Database seeding script
 * Cleans up all records and optionally seeds fresh demo data
 */

import { prisma } from '../src/lib/prisma';

async function cleanDatabase() {
  console.log('🧹 Cleaning up database records...');

  try {
    // Delete records in correct order (respecting foreign key constraints)
    await prisma.ticket.deleteMany({});
    console.log('✅ Cleared all tickets');

    await prisma.troubleshootingStep.deleteMany({});
    console.log('✅ Cleared all troubleshooting steps');

    await prisma.troubleshootingSession.deleteMany({});
    console.log('✅ Cleared all troubleshooting sessions');

    await prisma.user.deleteMany({});
    console.log('✅ Cleared all users');

    console.log('🎉 Database cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database cleanup...');

    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Clean up existing data
    await cleanDatabase();

    // Display final stats
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.troubleshootingSession.count();
    const stepCount = await prisma.troubleshootingStep.count();
    const ticketCount = await prisma.ticket.count();

    console.log('📊 Database is now empty:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Steps: ${stepCount}`);
    console.log(`   Tickets: ${ticketCount}`);

    console.log('🎉 Database cleanup complete!');

  } catch (error) {
    console.error('❌ Cleanup process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
main();
