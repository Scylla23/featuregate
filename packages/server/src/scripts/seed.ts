import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Project } from '../models/Project.js';
import { Environment } from '../models/Environment.js';
import { Segment } from '../models/Segment.js';
import { SegmentConfig } from '../models/SegmentConfig.js';
import { Flag } from '../models/Flag.js';
import { FlagConfig } from '../models/FlagConfig.js';
import { User } from '../models/User.js';
import { TeamMember } from '../models/TeamMember.js';
import { ApiKey } from '../models/ApiKey.js';
import { AuditLog } from '../models/AuditLog.js';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { generateSdkKey, generateMobileKey, generateClientSideId } from '../utils/keys.js';

async function seed() {
  await connectDatabase();

  try {
    console.log('🗑️ Clearing existing data...');
    await Promise.all([
      Project.deleteMany({}),
      Environment.deleteMany({}),
      Segment.deleteMany({}),
      SegmentConfig.deleteMany({}),
      Flag.deleteMany({}),
      FlagConfig.deleteMany({}),
      User.deleteMany({}),
      TeamMember.deleteMany({}),
      ApiKey.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // 0. Create Admin User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUser = await User.create({
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
      description: 'The primary application for FeatureGate demo',
      createdBy: adminUser._id,
    });

    // 2. Create Environments
    const prodEnv = await Environment.create({
      key: 'production',
      name: 'Production',
      projectId: project._id,
      sdkKey: generateSdkKey(),
      mobileKey: generateMobileKey(),
      clientSideId: generateClientSideId(),
      description: 'Live production environment',
      color: '#22C55E',
      isCritical: true,
      requireConfirmation: true,
      sortOrder: 0,
      createdBy: adminUser._id,
    });

    const stagingEnv = await Environment.create({
      key: 'staging',
      name: 'Staging',
      projectId: project._id,
      sdkKey: generateSdkKey(),
      mobileKey: generateMobileKey(),
      clientSideId: generateClientSideId(),
      description: 'Pre-production staging environment',
      color: '#EAB308',
      sortOrder: 1,
      createdBy: adminUser._id,
    });

    const devEnv = await Environment.create({
      key: 'development',
      name: 'Development',
      projectId: project._id,
      sdkKey: generateSdkKey(),
      mobileKey: generateMobileKey(),
      clientSideId: generateClientSideId(),
      description: 'Local development environment',
      color: '#3B82F6',
      sortOrder: 2,
      createdBy: adminUser._id,
    });

    const allEnvs = [prodEnv, stagingEnv, devEnv];

    // 3. Create TeamMember for admin user (owner)
    await TeamMember.create({
      projectId: project._id,
      userId: adminUser._id,
      email: adminUser.email,
      name: adminUser.name,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });
    console.log('👥 Team member created for admin user');

    // 4. Create a Segment (Beta Testers) — project-level
    const betaSegment = await Segment.create({
      key: 'beta-testers',
      name: 'Beta Testers',
      projectId: project._id,
    });

    // Create SegmentConfig for each environment
    for (const env of allEnvs) {
      await SegmentConfig.create({
        segmentId: betaSegment._id,
        segmentKey: betaSegment.key,
        projectId: project._id,
        environmentKey: env.key,
        included: env.key === 'production' ? ['user-42', 'user-99'] : [],
        excluded: [],
        rules:
          env.key === 'production'
            ? [
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
              ]
            : [],
      });
    }

    // 5. Create a Flag (New Checkout Flow) — project-level
    const checkoutFlag = await Flag.create({
      key: 'new-checkout',
      name: 'New Checkout Flow',
      projectId: project._id,
      variations: [
        { value: false, name: 'Off' },
        { value: true, name: 'On' },
      ],
    });

    // Create FlagConfig for each environment
    for (const env of allEnvs) {
      await FlagConfig.create({
        flagId: checkoutFlag._id,
        flagKey: checkoutFlag.key,
        projectId: project._id,
        environmentKey: env.key,
        enabled: env.key === 'production', // Only enabled in production
        offVariation: 0,
        fallthrough: { variation: 0 },
        targets: [],
        rules:
          env.key === 'production'
            ? [
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
              ]
            : [],
      });
    }

    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await closeDatabase();
  }
}

seed();
