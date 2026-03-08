/**
 * Test runner for: index2.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 7 March 2026
 * @note Can't believe, I'm starting over. The goods news is that I could use code generation to fill it.
 */

/**
 * Import here
 */
import {
  buildMessageApp,
  MessageService,
  Message,
  lastRequestTime,
} from './index2';
import { it, describe, expect, beforeEach } from 'bun:test';

/**
 * Const var here.
 */
const BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000';
let testApp: ReturnType<typeof buildMessageApp>;
const group = new MessageService();
const app = buildMessageApp(group);

/**
 * Test runner pipeline.
 */
describe('Testing wildcards', () => {
  it('Should return wildcards with custom Error', async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/9999`, {
        method: 'POST',
      })
    );

    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data).toBeObject();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('availableEndpoints');
    expect(data).toHaveProperty('timestamp');
  });
});

describe('Should return Error classes', () => {
  it('Should return custom error with status ', async () => {});
});

describe('Testing /messages REST API', () => {
  describe('GET /messages', () => {
    beforeEach(() => {
      testApp = buildMessageApp(new MessageService());
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
      group.add('Alice', 'Hello!');

      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'GET',
        })
      );

      const data = (await response.json()) as Message[];
      expect(response.status).toBe(200);
      expect(data).toBeArray();
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('Alice');
    });
  });

  describe('POST /messages', () => {
    beforeEach(() => {
      testApp = buildMessageApp(new MessageService());
    });

    it('Should create a new message', async () => {
      const response = await app.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Bob',
            text: 'Coffee',
          }),
        })
      );

      const created = (await response.json()) as Message[];
      expect(response.status).toBe(201);
      expect(created).toBeObject();
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('name', 'Bob');
      expect(created).toHaveProperty('text', 'Coffee');
      expect(typeof created.id).toBe('string');
    });
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
    expect(data).toHaveProperty(
      'summary',
      'Expected string length greater or equal to 2'
    );
    expect(data).toHaveProperty(
      'message',
      'Expected string length greater or equal to 2'
    );
    expect(data).toHaveProperty('type', 'validation');
    expect(data).toHaveProperty('on', 'body');
    expect(data).toHaveProperty('property', '/name');
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
    expect(data).toHaveProperty(
      'summary',
      'Expected string length greater or equal to 5'
    );
    expect(data).toHaveProperty(
      'message',
      'Expected string length greater or equal to 5'
    );
    expect(data).toHaveProperty('type', 'validation');
    expect(data).toHaveProperty('on', 'body');
    expect(data).toHaveProperty('property', '/text');
  });

  describe('Should enforce rate limiting', () => {
    beforeEach(() => {
      lastRequestTime.clear();
    });

    it('Overlap request to test rate limiting', async () => {
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

      expect(request1.status).toBe(201);

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
      // TODO: Continue this tomorrow.
      const errorData = await request2.json();
      expect(errorData).toHaveProperty(
        'error',
        'Too many request at once, please slow down!'
      );
      expect(errorData).toHaveProperty('timestamp');
    });
  });
});
