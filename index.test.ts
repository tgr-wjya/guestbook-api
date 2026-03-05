/**
 * Test runner for my index.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 6 March 2026
 * @note A bored project, let's see how fast I can make it 100% coverage.
 */

import { it, describe, expect, beforeEach } from 'bun:test';
import { app, messages, INTRODUCTION } from '.';

const BASE_URL = 'http://localhost:3000';

describe('Testing wildcards, headers and server uptime', () => {
  it('Should return 404 and object for wildcards', async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/899`, {
        method: 'POST',
      })
    );

    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data).toBeObject();
    expect(data).toEqual({
      error: 'Not found ¯\\_(ツ)_/¯',
      message: "This endpoint doesn't exist",
      availableEndpoints: [
        'GET /',
        'GET /messages',
        'POST /messages',
        'DELETE /messages',
      ],
    });
  });

  it('Should return myself with headers (CORS and Powered-By)', async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}`, {
        method: 'GET',
      })
    );

    const data = await response.json();
    expect(data).toHaveProperty('greet');
    expect(data).toHaveProperty('uptime');
    expect(data.greet).toBe(INTRODUCTION);
    expect(typeof data.uptime).toBe('string');
    expect(response.headers.get('X-Powered-By')).toBe('Elysia + Bun + Fly.io');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('Testing /messages', () => {
  describe('GET /messages', () => {
    beforeEach(() => {
      messages.length = 0;
    });

    it('Should return empty array when no messages exist', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'GET',
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toBeArray();
      expect(data.length).toBe(0);
    });

    it('Should return all messages', async () => {
      messages.push({
        id: '1',
        name: 'Alice',
        text: 'Something here.',
      });
      messages.push({
        id: '2',
        name: 'Bob',
        text: 'Another message.',
      });

      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'GET',
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toBeArray();
      expect(data.length).toBe(2);
      expect(data[0].name).toBe('Alice');
      expect(data[1].name).toBe('Bob');
    });
  });

  describe('POST /messages', () => {
    beforeEach(() => {
      messages.length = 0;
    });

    it('Should create a new message', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Charlie',
            text: 'Just checking along',
          }),
        })
      );

      const created = await response.json();
      expect(response.status).toBe(201);
      expect(created).toBeObject();
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('name', 'Charlie');
      expect(created).toHaveProperty('text', 'Just checking along');
      expect(typeof created.id).toBe('string');
      expect(messages.length).toBe(1);
    });

    it('Should validate name minimum length', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'A',
            text: 'Valid text here',
          }),
        })
      );

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('Should validate text minimum length', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Valid',
            text: 'Bad',
          }),
        })
      );

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('Should enforce rate limiting', async () => {
      const request1 = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'User1',
            text: 'First message',
          }),
        })
      );

      expect(request1.status).toBe(429);

      const request2 = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'User1',
            text: 'Second message too fast',
          }),
        })
      );

      expect(request2.status).toBe(429);
      const errorData = await request2.json();
      expect(errorData).toHaveProperty('error');
    });

    it('Should allow requests after rate limit window', async () => {
      await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'User1',
            text: 'First message',
          }),
        })
      );

      await new Promise(resolve => setTimeout(resolve, 2100));

      const request2 = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'User1',
            text: 'Second message after waiting',
          }),
        })
      );

      expect(request2.status).toBe(201);
    });
  });

  describe('DELETE /messages', () => {
    beforeEach(() => {
      messages.length = 0;
    });

    it('Should delete a message by id', async () => {
      messages.push({
        id: 'test-id-1',
        name: 'Alice',
        text: 'Message to delete',
      });

      const response = await app.handle(
        new Request(`${BASE_URL}/messages/test-id-1`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(204);
      expect(messages.length).toBe(0);
    });

    it('Should return 404 when message not found', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages/non-existent-id`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Message Not Found');
    });

    it('Should keep other messages when deleting one', async () => {
      messages.push({
        id: 'id-1',
        name: 'Alice',
        text: 'Keep this',
      });
      messages.push({
        id: 'id-2',
        name: 'Bob',
        text: 'Delete this',
      });
      messages.push({
        id: 'id-3',
        name: 'Charlie',
        text: 'Keep this too',
      });

      await app.handle(
        new Request(`${BASE_URL}/messages/id-2`, {
          method: 'DELETE',
        })
      );

      expect(messages.length).toBe(2);
      expect(messages.find(m => m.id === 'id-1')).toBeDefined();
      expect(messages.find(m => m.id === 'id-3')).toBeDefined();
      expect(messages.find(m => m.id === 'id-2')).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('Should include timestamp in error responses', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages/non-existent`, {
          method: 'DELETE',
        })
      );

      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });
});
