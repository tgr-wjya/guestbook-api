/**
 * Test runner for DELETE /messages
 *
 * Test structure overview:
 * 1. Deleting an existing message returns 204
 * 2. Deleted message no longer appears in GET /messages
 * 3. Deleting a non-existent ID returns 404
 * 4. Deleting with a malformed/invalid UUID returns the appropriate error
 * 5. Deleting the same message twice returns 404 on the second attempt
 * 6. Rate limiting applies to DELETE requests
 * 7. Deleting one message does not affect other existing messages
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { buildMessageApp, type Message } from '../src/app';
import { MessageService } from '../src/service/message.service';
import { lastRequestTime } from '../src/config';

const MESSAGE_URL = Bun.env.MESSAGE_URL || 'http://localhost:3000/messages';
let testApp: ReturnType<typeof buildMessageApp>;
let service: MessageService;

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
    expect(returned[0]).toHaveProperty('id', created2.id);
    expect(returned[0]).toHaveProperty('name', 'Lang');
    expect(returned[0]).toHaveProperty('text', 'Insert something');
  });
});
