/**
 * Test runner for GET /messages
 *
 * Structure Overview:
 * 1. Should return an empty array when no message exist
 * 2. Should return a message
 * 3. Should return messages with the correct shape (id, name, text)
 * 4. Should preserve insertion order
 * 5. Should return messages from different POST requests in the list
 * 6. Should not be affected by rate limiting
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

describe('GET /messages', () => {
  beforeEach(() => {
    service = new MessageService();
    testApp = buildMessageApp(service);
    lastRequestTime.clear();
  });

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
