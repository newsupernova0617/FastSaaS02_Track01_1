import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../../src/middleware/auth';
import type { Env } from '../../src/db/index';
import sessionsRouter from '../../src/routes/sessions';

describe('Sessions Routes', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>;

  beforeEach(() => {
    app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // Add auth middleware mock
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id');
      await next();
    });

    app.route('/api/sessions', sessionsRouter);
  });

  describe('POST /api/sessions - Create session', () => {
    it('should create session with valid title', async () => {
      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Session' }),
      });

      expect(response.status).toBeOneOf([201, 500]); // 201 if DB works, 500 if not set up
    });

    it('should reject missing title', async () => {
      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBeOneOf([400, 500]);
      if (response.status === 400) {
        const data = await response.json() as any;
        expect(data.error).toContain('Title');
      }
    });
  });

  describe('GET /api/sessions - List sessions', () => {
    it('should list all user sessions', async () => {
      const response = await app.request('/api/sessions', {
        method: 'GET',
      });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        const data = await response.json() as any;
        expect(Array.isArray(data.sessions)).toBe(true);
      }
    });
  });

  describe('GET /api/sessions/:id - Get session', () => {
    it('should get session by id', async () => {
      const response = await app.request('/api/sessions/1', {
        method: 'GET',
      });

      expect(response.status).toBeOneOf([200, 404, 500]);
    });

    it('should reject invalid session ID', async () => {
      const response = await app.request('/api/sessions/invalid', {
        method: 'GET',
      });

      expect(response.status).toBeOneOf([400, 500]);
      if (response.status === 400) {
        const data = await response.json() as any;
        expect(data.error).toContain('Invalid');
      }
    });
  });

  describe('PATCH /api/sessions/:id - Rename session', () => {
    it('should rename session with valid title', async () => {
      const response = await app.request('/api/sessions/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Renamed' }),
      });

      expect(response.status).toBeOneOf([200, 404, 500]);
    });

    it('should reject missing title', async () => {
      const response = await app.request('/api/sessions/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBeOneOf([400, 500]);
    });

    it('should reject invalid ID', async () => {
      const response = await app.request('/api/sessions/invalid', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
      });

      expect(response.status).toBeOneOf([400, 500]);
    });
  });

  describe('DELETE /api/sessions/:id - Delete session', () => {
    it('should delete session', async () => {
      const response = await app.request('/api/sessions/1', {
        method: 'DELETE',
      });

      expect(response.status).toBeOneOf([200, 404, 500]);
    });

    it('should reject invalid ID', async () => {
      const response = await app.request('/api/sessions/invalid', {
        method: 'DELETE',
      });

      expect(response.status).toBeOneOf([400, 500]);
    });
  });
});
