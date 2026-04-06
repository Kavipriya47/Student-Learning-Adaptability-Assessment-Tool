const request = require('supertest');
const mongoose = require('mongoose');

// Mock mongoose to avoid real DB connections during tests
jest.mock('mongoose', () => {
    const originalMongoose = jest.requireActual('mongoose');
    return {
        ...originalMongoose,
        connect: jest.fn().mockResolvedValue(true),
        connection: {
            on: jest.fn(),
            once: jest.fn(),
            close: jest.fn().mockResolvedValue(true),
        },
    };
});

const app = require('../index');

describe('API Health and Authentication', () => {
    it('should return 200 OK for /health', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should return 401 for protected /api/admin/staff without token', async () => {
        const res = await request(app).get('/api/admin/staff');
        expect(res.statusCode).toEqual(401);
    });
});
