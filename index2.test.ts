/**
 * Test runner for: index2.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 9 March 2026
 */

import { beforeEach, describe, expect, it } from 'bun:test';
/**
 * Import here
 */
import {
  buildMessageApp,
  lastRequestTime,
  type Message,
  MessageService,
} from './index2';

/**
 * Const var here.
 */
const BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000';
let testApp: ReturnType<typeof buildMessageApp>;
let service: MessageService;

// Type safety for wildcards.
interface Wildcards {
  error: string;
  message: string;
  availableEndpoints: string[];
}

// Coverage finished
describe('Testing server wildcards, headers, root', () => {
  beforeEach(() => {
    testApp = buildMessageApp(new MessageService());
  });

  it('Should return headers (CORS and Powered-By)', async () => {
    const response = await testApp.handle(
      new Request(`${BASE_URL}`, {
        method: 'GET',
      })
    );

    expect(response.headers.get('X-Powered-By')).toBe('Elysia + Bun + Railway');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  describe('GET /root', () => {
    it('Should return kaomoji text (made with ◉‿◉)', async () => {
      const response = await testApp.handle(
        new Request(`${BASE_URL}`, {
          method: 'GET',
        })
      );

      const kaomoji = await response.text();
      expect(kaomoji).toBe('made with ◉‿◉');
    });
  });

  describe('ALL /wildcards', () => {
    it('Should return a wildcards for invalid path', async () => {
      const response = await testApp.handle(
        new Request(`${BASE_URL}/999`, {
          method: 'PATCH',
        })
      );

      expect(response.status).toBe(404);
      const wildcards = (await response.json()) as Wildcards;
      expect(wildcards).toBeObject();
      expect(wildcards).toHaveProperty('error', 'Not found ¯\\_(ツ)_/¯');
      expect(wildcards).toHaveProperty(
        'message',
        "This endpoint doesn't exist"
      );
      expect(wildcards).toHaveProperty('timestamp');
      expect(wildcards.availableEndpoints).toEqual([
        'GET /',
        'GET /messages',
        'POST /messages',
        'DELETE /messages/:id',
      ]);
    });
  });
});

describe('Tesing /messages endpoints', () => {
  beforeEach(() => {
    service = new MessageService();
    testApp = buildMessageApp(service);
  });

  describe('GET /messages', () => {
    it('Should return an empty array when no message exist', async () => {
      const response = await testApp.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const emptyArray = await response.json();
      expect(emptyArray).toBeArray();
    });

    it('Should return a message', async () => {
      service.add('Alice', 'Hello!');
      service.add('Charlie', 'World!');

      const response = await testApp.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const mockData = (await response.json()) as Message[];
      expect(mockData).toBeArray();
      expect(mockData.length).toBe(2);
      expect(mockData[0]?.name).toBe('Alice');
      expect(mockData[1]?.name).toBe('Charlie');
      expect(mockData[0]?.text).toBe('Hello!');
      expect(mockData[1]?.text).toBe('World!');
    });

    // TODO: Test that each message in the array has the correct shape (id, name, text)
    // TODO: Test that the array preserves insertion order
    // TODO: Test that messages from different POST requests all appear in the list
    // TODO: Test that GET /messages is not affected by rate limiting
  });

  describe('POST /messages', () => {
    beforeEach(() => {
      service = new MessageService();
      testApp = buildMessageApp(service);
    });

    it('Should create a new message', async () => {
      const response = await testApp.handle(
        new Request(`${BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'David',
            text: 'Just checking along',
          }),
        })
      );

      const created = (await response.json()) as Message;
      expect(response.status).toBe(201);
      expect(created).toBeObject();
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('name', 'David');
      expect(created).toHaveProperty('text', 'Just checking along');
      expect(typeof created.id).toBe('string');
    });

    describe('Should enforce validation rules schema', () => {
      it('Should reject messages with names shorter than 2 characters', async () => {
        const response = await testApp.handle(
          new Request(`${BASE_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'A',
              text: 'Valid text here',
            }),
          })
        );

        // No need to assert anything else, only assert what the API actually owns here.
        expect(response.status).toBe(422);
      });

      it('Should reject messages with text shorter than 5 characters', async () => {
        const response = await testApp.handle(
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
      });
    });

    describe('Should enforce rate limiting', () => {
      beforeEach(() => {
        testApp = buildMessageApp(new MessageService());
        lastRequestTime.clear();
      });

      it('Should return 429 Too Many Requests if the same IP makes more than 5 requests within a minute', async () => {
        const request1 = await testApp.handle(
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

        const request2 = await testApp.handle(
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
        const overlap = await request2.text();
        expect(overlap).toBe('Too many request at once, please slow down!');
      });
    });

    // TODO: Test that the created message is actually persisted and retrievable via GET /messages
    // TODO: Test that missing required fields (no name, no text) returns 422
    // TODO: Test that extra/unknown fields in the body are ignored and don't cause errors
    // TODO: Test that the returned `id` is a valid UUID
    // TODO: Test that multiple unique messages can be created without conflict
  });

  describe('DELETE /messages', () => {
    beforeEach(() => {
      service = new MessageService();
      testApp = buildMessageApp(service);
    });

    // TODO: Test that deleting an existing message returns 200 (or 204)
    // TODO: Test that the deleted message no longer appears in GET /messages
    // TODO: Test that deleting a non-existent ID returns 404
    // TODO: Test that deleting with a malformed/invalid UUID returns the appropriate error
    // TODO: Test that deleting the same message twice returns 404 on the second attempt
    // TODO: Test that rate limiting applies to DELETE requests
    // TODO: Test that deleting one message does not affect other existing messages
  });
});
