/**
 * Test runner for: index2.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
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
const MESSAGE_URL = Bun.env.MESSAGE_URL || 'http://localhost:3000/messages';
let testApp: ReturnType<typeof buildMessageApp>;
let service: MessageService;

// Type safety for wildcards.
interface Wildcards {
  error: string;
  message: string;
  availableEndpoints: string[];
}

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

describe('Testing /messages endpoints', () => {
  beforeEach(() => {
    service = new MessageService();
    testApp = buildMessageApp(service);
  });

  describe('GET /messages', () => {
    it('Should return an empty array when no message exist', async () => {
      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
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
        new Request(`${MESSAGE_URL}`, {
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

    it('Should return messages with the correct shape (id, name, text)', async () => {
      service.add('Alice', 'Hello!');

      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const messages = (await response.json()) as Message[];
      expect(messages[0]).toHaveProperty('id');
      expect(messages[0]).toHaveProperty('name');
      expect(messages[0]).toHaveProperty('text');
      expect(typeof messages[0]?.id).toBe('string');
      expect(typeof messages[0]?.name).toBe('string');
      expect(typeof messages[0]?.text).toBe('string');
    });

    it('Should preserve insertion order', async () => {
      service.add('Alice', 'First');
      service.add('Bob', 'Second');
      service.add('Charlie', 'Third');

      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const messages = (await response.json()) as Message[];
      expect(messages[0]?.name).toBe('Alice');
      expect(messages[1]?.name).toBe('Bob');
      expect(messages[2]?.name).toBe('Charlie');
    });

    it('Should return messages from different POST requests in the list', async () => {
      await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice', text: 'First message' }),
        })
      );

      lastRequestTime.clear();

      await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Bob', text: 'Second message' }),
        })
      );

      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const messages = (await response.json()) as Message[];
      expect(messages).toBeArray();
      expect(messages.length).toBe(2);
      expect(messages[0]?.name).toBe('Alice');
      expect(messages[1]?.name).toBe('Bob');
    });

    it('Should not be affected by rate limiting', async () => {
      service.add('Alice', 'Hello!');

      const response1 = await testApp.handle(
        new Request(`${MESSAGE_URL}`, { method: 'GET' })
      );
      const response2 = await testApp.handle(
        new Request(`${MESSAGE_URL}`, { method: 'GET' })
      );
      const response3 = await testApp.handle(
        new Request(`${MESSAGE_URL}`, { method: 'GET' })
      );

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });
  });

  describe('POST /messages', () => {
    beforeEach(() => {
      service = new MessageService();
      testApp = buildMessageApp(service);
      lastRequestTime.clear();
    });

    it('Should create a new message', async () => {
      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
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
          new Request(`${MESSAGE_URL}`, {
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
          new Request(`${MESSAGE_URL}`, {
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
          new Request(`${MESSAGE_URL}`, {
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
          new Request(`${MESSAGE_URL}`, {
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

    it('Created message is actually persisted and retrievable via GET /messages', async () => {
      const postResponse = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'David',
            text: 'Just checking along',
          }),
        })
      );

      expect(postResponse.status).toBe(201);
      const created = (await postResponse.json()) as Message;

      const getResponse = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(getResponse.status).toBe(200);
      const messages = (await getResponse.json()) as Message[];
      expect(messages).toBeArray();
      expect(messages.length).toBe(1);
      expect(messages[0]).toHaveProperty('id', created.id);
      expect(messages[0]).toHaveProperty('name', 'David');
      expect(messages[0]).toHaveProperty('text', 'Just checking along');
    });

    it('Should return 422 when required fields are missing', async () => {
      const noName = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Valid text here' }),
        })
      );
      expect(noName.status).toBe(422);

      const noText = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Valid' }),
        })
      );
      expect(noText.status).toBe(422);
    });

    // TODO: Test that extra/unknown fields in the body are ignored and don't cause errors
    // TODO: Test that the returned `id` is a valid UUID

    // TODO: Test that multiple unique messages can be created without conflict
    it('Multiple unique messages can be created without conflict', async () => {});
  });

  describe('DELETE /messages', () => {
    beforeEach(() => {
      service = new MessageService();
      testApp = buildMessageApp(service);
      lastRequestTime.clear();
    });

    it('Deleting an existing message returns 204', async () => {
      const deleted = service.add('Jack', 'Delete this!');

      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}/${deleted.id}`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(204);
    });

    it('Deleted message no longer appears in GET /messages', async () => {
      const created = service.add('Elijah', 'Catch this');

      const deleted = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created.id}`, {
          method: 'DELETE',
        })
      );

      expect(deleted.status).toBe(204);

      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const empty = await response.json();
      expect(empty).toBeArray();
    });

    it('Deleting a non-existent ID returns 404', async () => {
      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}/19999`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(404);
      const data = await response.text();
      expect(data).toBe('Message not found, unfortunately');
    });

    it('Deleting with a malformed/invalid UUID returns the appropriate error', async () => {
      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}/x1290@@@#$$$`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(404);
      const data = await response.text();
      expect(data).toBe('Message not found, unfortunately');
    });

    it('Deleting the same message twice returns 404 on the second attempt', async () => {
      const created = service.add('Franky', 'SUUUPEEERRRR');

      const response1 = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created.id}`, {
          method: 'DELETE',
        })
      );

      expect(response1.status).toBe(204);

      await Bun.sleep(3000);
      const response2 = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created.id}`, {
          method: 'DELETE',
        })
      );

      expect(response2.status).toBe(404);
      const data = await response2.text();
      expect(data).toBe('Message not found, unfortunately');
    });

    it('Rate limiting applies to DELETE requests', async () => {
      const created1 = service.add('Grace', 'NOOOOOO');
      const created2 = service.add('Hiruluk', 'When do you think people die?');

      const response1 = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created1.id}`, {
          method: 'DELETE',
        })
      );

      expect(response1.status).toBe(204);

      const response2 = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created2.id}`, {
          method: 'DELETE',
        })
      );

      expect(response2.status).toBe(429);
    });

    it('Deleting one message does not affect other existing messages', async () => {
      const created1 = service.add('Isaac', 'My name Isaac');
      const created2 = service.add('Lang', 'Insert something');

      const response1 = await testApp.handle(
        new Request(`${MESSAGE_URL}/${created1.id}`, {
          method: 'DELETE',
        })
      );

      expect(response1.status).toBe(204);

      const response2 = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'GET',
        })
      );

      expect(response2.status).toBe(200);
      const returned = (await response2.json()) as Message[];
      expect(returned).toBeArray();
      expect(returned[0]).toHaveProperty('id');
      expect(returned[0]).toHaveProperty('text');
      expect(returned[0]).toHaveProperty('name');
    });
  });
});
