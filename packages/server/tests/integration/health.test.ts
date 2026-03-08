import request from 'supertest';
import { jest } from '@jest/globals';

// We need comprehensive mocks because importing app.ts pulls in routes/models
// that use mongoose Schema, model, Types, etc.

const mockMongooseState = { readyState: 1 };

jest.unstable_mockModule('mongoose', () => {
  const SchemaClass = class MockSchema {
    obj: unknown;
    constructor(definition: unknown, _options?: unknown) {
      this.obj = definition;
    }
    pre() {
      return this;
    }
    post() {
      return this;
    }
    index() {
      return this;
    }
    virtual() {
      return { get: jest.fn(), set: jest.fn() };
    }
    set() {
      return this;
    }
    static Types = {
      ObjectId: class ObjectId {
        toString() {
          return 'mock-id';
        }
      },
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Mixed: class Mixed {},
    };
  };

  const mockModel = jest.fn().mockImplementation(() => {
    return {};
  });
  // Add static methods to mockModel
  Object.assign(mockModel, {
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({}),
    deleteOne: jest.fn().mockResolvedValue({}),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
  });

  const modelFn = jest.fn().mockReturnValue(mockModel);

  const Types = {
    ObjectId: class ObjectId {
      toString() {
        return 'mock-id';
      }
      static isValid() {
        return true;
      }
    },
  };

  const mongoose = {
    Schema: SchemaClass,
    model: modelFn,
    Types,
    connection: mockMongooseState,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    default: undefined as unknown,
  };
  mongoose.default = mongoose;

  return mongoose;
});

// Mock redis
const mockRedisClient = {
  status: 'ready' as string,
};

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
  connectRedis: jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock database config
jest.unstable_mockModule('../../src/config/database.js', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  disconnectDB: jest.fn().mockResolvedValue(undefined),
}));

// Mock jsonwebtoken for auth middleware
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn().mockReturnValue({ userId: 'mock', role: 'admin' }),
  },
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ userId: 'mock', role: 'admin' }),
}));

// Import app after mocks are set up
const { default: app } = await import('../../src/app.js');

describe('Health Check Endpoints', () => {
  describe('GET /healthz', () => {
    it('returns 200 with { status: "ok" }', async () => {
      const res = await request(app).get('/healthz');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /readyz', () => {
    it('returns 200 when both MongoDB and Redis are connected', async () => {
      mockMongooseState.readyState = 1;
      mockRedisClient.status = 'ready';

      const res = await request(app).get('/readyz');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        checks: {
          mongo: 'connected',
          redis: 'connected',
        },
      });
    });

    it('returns 503 when MongoDB is disconnected', async () => {
      mockMongooseState.readyState = 0;
      mockRedisClient.status = 'ready';

      const res = await request(app).get('/readyz');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: 'unavailable',
        checks: {
          mongo: 'disconnected',
          redis: 'connected',
        },
      });
    });

    it('returns 503 when Redis is disconnected', async () => {
      mockMongooseState.readyState = 1;
      mockRedisClient.status = 'reconnecting';

      const res = await request(app).get('/readyz');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: 'unavailable',
        checks: {
          mongo: 'connected',
          redis: 'disconnected',
        },
      });
    });
  });
});
