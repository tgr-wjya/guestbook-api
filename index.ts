/**
 * In-Memory Guestbook API
 *
 * Endpoints:
 * GET / - Server info + uptime
 * GET /messages - List all messages
 * POST /messages - Leave a message (name + text, validated)
 * DELETE /messages/:id - Delete a message by ID
 *
 * @author Tegar Wijaya Kusuma
 * @date 3 March 2026
 * @note A bored project in the middle of the night and also to learn how Fly.io works since its the only one that support Elysia + Bun deployment.
 */

import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';

const PORT = 3000;
const MIN_NAME_LENGTH = 2;
const MIN_TEXT_LENGTH = 5;
const RATE_LIMIT_MS = 2000;
const lastRequestTime = new Map<string, number>();
export const INTRODUCTION =
  "heya there! my name's tegar wijaya kusuma, and you're hitting my guestbook api. if this is intentional do go ahead and continue what you're doing. thanks for visiting!";

interface Message {
  id: string;
  name: string;
  text: string;
}

export const messages: Message[] = [];

export const messageGroup = new Elysia().group('/messages', app =>
  app

    /**
     * Global onError messageGroup
     */
    .onError(({ error }) => {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    })

    /**
     * GET /messages
     * List all messages
     */
    .get('/', async ({ set }) => {
      set.status = 200;
      return messages;
    })

    /**
     * POST /messages
     * Map serve on memory only.
     */
    .post(
      '/',
      async ({ set, body }) => {
        const newMessage = {
          id: crypto.randomUUID(),
          name: body.name,
          text: body.text,
        };

        messages.push(newMessage);

        set.status = 201;
        return newMessage;
      },
      {
        body: t.Object({
          name: t.String({ minLength: MIN_NAME_LENGTH }),
          text: t.String({ minLength: MIN_TEXT_LENGTH }),
        }),
        beforeHandle: ({ set, request }) => {
          const ip =
            request.headers.get('x-forwarded-for') ??
            request.headers.get('host') ??
            'unknown';
          const now = Date.now();
          const last = lastRequestTime.get(ip);

          if (last && now - last < RATE_LIMIT_MS) {
            set.status = 429;
            throw new Error('Too many request, please slow down!');
          }

          lastRequestTime.set(ip, now);
        },
      }
    )

    /**
     * DELETE /messages
     * Delete specific message.
     */
    .delete(
      '/:id',
      async ({ set, params }) => {
        const index = messages.findIndex(t => t.id === params.id);

        if (index === -1) {
          set.status = 404;
          throw new Error('Message Not Found');
        }

        messages.splice(index, 1);
        set.status = 204;
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )
);

export const app = new Elysia()
  .onAfterHandle(({ set }) => {
    set.headers['X-Powered-By'] = 'Elysia + Bun + Fly.io';
    set.headers['Access-Control-Allow-Origin'] = '*';
  })

  .get('/', async () => ({
    greet: INTRODUCTION,
    uptime: `${Math.floor(process.uptime())}`,
  }))

  .use(messageGroup)
  .use(swagger())

  /**
   * Global wildcards
   */
  .all('/*', ({ set }) => {
    set.status = 404;

    return {
      error: 'Not found ¯\\_(ツ)_/¯',
      message: "This endpoint doesn't exist",
      availableEndpoints: [
        'GET /',
        'GET /messages',
        'POST /messages',
        'DELETE /messages',
      ],
    };
  })

  .listen(PORT);

console.log(`Elysia listening at: http://localhost:${PORT}`);
console.log(`Check out Swagger here: http://localhost:${PORT}/swagger`);
