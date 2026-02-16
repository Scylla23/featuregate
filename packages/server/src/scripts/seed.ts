import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Environment } from '../models/Environment.js';
import { Segment } from '../models/Segment.js';
import { Flag } from '../models/Flag.js';
import { User } from '../models/User.js';
import { connectDatabase, closeDatabase } from '../config/database.js';

async function seed() {
  await connectDatabase();

  try {
    console.log('🗑️ Clearing existing data...');
    await Promise.all([
      Project.deleteMany({}),
      Environment.deleteMany({}),
      Segment.deleteMany({}),
      Flag.deleteMany({}),
      User.deleteMany({}),
    ]);

    // 0. Create Admin User
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      email: 'admin@featuregate.io',
      hashedPassword,
      name: 'Admin',
      role: 'admin',
    });
    console.log('👤 Admin user created (admin@featuregate.io / password123)');

    // 1. Create a Project
    const project = await Project.create({
      key: 'main-app',
      name: 'Main Application',
    });

    // 2. Create Environments
    const prodEnv = await Environment.create({
      key: 'production',
      name: 'Production',
      projectId: project._id,
      sdkKey: 'sdk-prod-12345',
    });

    // 3. Create a Segment (Beta Testers)
    const betaSegment = await Segment.create({
      key: 'beta-testers',
      name: 'Beta Testers',
      projectId: project._id,
      environmentKey: prodEnv.key,
      included: ['user-42', 'user-99'],
      rules: [
        {
          id: 'rule-internal',
          clauses: [
            {
              attribute: 'email',
              operator: 'endsWith',
              values: ['@featuregate.io'],
            },
          ],
        },
      ],
    });

    // 4. Create a Flag (New Checkout Flow)
    await Flag.create({
      key: 'new-checkout',
      name: 'New Checkout Flow',
      projectId: project._id,
      environmentKey: prodEnv.key,
      enabled: true,
      flagType: 'boolean',
      variations: [
        { value: false, name: 'Off' },
        { value: true, name: 'On' },
      ],
      offVariation: 0,
      fallthrough: { variation: 0 },
      rules: [
        {
          id: 'rule-beta',
          description: 'Target beta testers',
          clauses: [
            {
              attribute: 'segmentMatch',
              operator: 'in',
              values: [betaSegment._id.toString()],
            },
          ],
          rollout: { variation: 1 },
        },
      ],
    });

    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await closeDatabase();
  }
}

seed();
