/**
 * Test runner for:
 *
 * 1. GET /root
 * 2. ALL /wildcards
 * 3. Headers (CORS and Powered-By)
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { buildMessageApp } from '../src/app';
import { MessageService } from '../src/service/message.service';

const BASE_URL = Bun.env.BASE_URL || 'http://localhost:3000';
let testApp: ReturnType<typeof buildMessageApp>;

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
