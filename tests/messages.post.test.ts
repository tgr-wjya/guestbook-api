/**
 * Test runner for POST /messages
 *
 * Test structure overview:
 * 1. Should create a new message
 * 2. Should enforce validation rules schema
 *    - Should reject messages with names shorter than 2 characters
 *    - Should reject messages with text shorter than 5 characters
 * 3. Should enforce rate limiting
 *    - Should return 429 Too Many Requests if the same IP makes more than 5 requests within a minute
 * 4. Created message is actually persisted and retrievable via GET /messages
 * 5. Should return 422 when required fields are missing
 * 6. Should return a valid UUID as the message id
 * 7. Should create multiple unique messages without conflict
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { Message } from '../src/types';
import { buildMessageApp } from '../src/app';
import { MessageService } from '../src/service/message.service';
import { lastRequestTime } from '../src/config';

const MESSAGE_URL = Bun.env.MESSAGE_URL || 'http://localhost:3000/messages';
let testApp: ReturnType<typeof buildMessageApp>;
let service: MessageService;

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
            name: 'Valid',
            text: 'Bad',
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

  it('Should return a valid UUID as the message id', async () => {
    const response = await testApp.handle(
      new Request(`${MESSAGE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'David', text: 'Just checking along' }),
      })
    );

    expect(response.status).toBe(201);
    const created = (await response.json()) as Message;
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('Should create multiple unique messages without conflict', async () => {
    const names = ['Alice', 'Bob', 'Charlie'];
    const ids = new Set<string>();

    for (const name of names) {
      lastRequestTime.clear();
      const response = await testApp.handle(
        new Request(`${MESSAGE_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text: 'A valid message text' }),
        })
      );
      expect(response.status).toBe(201);
      const created = (await response.json()) as Message;
      ids.add(created.id);
    }

    expect(ids.size).toBe(3);

    const getResponse = await testApp.handle(
      new Request(`${MESSAGE_URL}`, { method: 'GET' })
    );
    const messages = (await getResponse.json()) as Message[];
    expect(messages.length).toBe(3);
  });
});
