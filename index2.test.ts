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
import { buildMessageApp, MessageGroupService, Message } from './index2';
import { it, describe, expect, beforeEach } from 'bun:test';

/**
 * Const var here.
 */
const BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000';
let testApp: ReturnType<typeof buildMessageApp>;
const group = new MessageGroupService();
const app = buildMessageApp(group);

/**
 * Test runner pipeline.
 */
describe('Testing wildcards and Error', () => {
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

describe('Testing /messages', () => {
  describe('GET /messages', () => {
    beforeEach(() => {
      testApp = buildMessageApp(new MessageGroupService());
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
});
