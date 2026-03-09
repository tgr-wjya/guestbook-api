/**
 * Test runner for: index2.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 9 March 2026
 */

/**
 * Import here
 */
import {
  buildMessageApp,
  MessageService,
  type Message,
  lastRequestTime,
} from './index2';
import { it, describe, expect, beforeEach } from 'bun:test';

/**
 * Const var here.
 */
const BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000';
let testApp: ReturnType<typeof buildMessageApp>;
let service: MessageService;

describe('Testing server wildcards, headers, root', () => {
  beforeEach(() => {
    testApp = buildMessageApp(new MessageService());
  });

  describe('GET /root', () => {
    it('Should return kaomoji text', async () => {
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
          method: 'PATCH', // To make sure it accept ALL method.
        })
      );

      // TODO: Continue the assertion.
    });
  });
});
