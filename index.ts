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
 * @date 6 March 2026
 * @note A bored project in the middle of the night and also to learn how Railway works since I heard the deployment process is quite easy.
 */

import { swagger } from '@elysiajs/swagger';
import { Elysia, t } from 'elysia';

/**
 * CONST definition goes here.
 */
const PORT = Bun.env.PORT || 3000;
const HOSTNAME = Bun.env.HOST || '0.0.0.0';
const MIN_NAME_LENGTH = 2;
const MIN_TEXT_LENGTH = 5;
const RATE_LIMIT_MS = 2000;
const CLEANUP_INTERVAL_MS = RATE_LIMIT_MS * 10;
export const INTRODUCTION = 'made with ◉‿◉';

//
/**
 * A map that stores the timestamp of the last request made by each client, identified by their IP address or unique identifier.
 *
 * This map is used for rate limiting purposes to track when each client last made a request to the API.
 * The key represents the client identifier (typically an IP address), and the value represents the timestamp
 * in milliseconds (from `Date.now()`) when that client's last request was processed.
 *
 * @constant
 * @type {Map<string, number>}
 */
export const lastRequestTime = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - CLEANUP_INTERVAL_MS;
  for (const [ip, now] of lastRequestTime) {
    if (now < cutoff) lastRequestTime.delete(ip);
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Custom Error Classes
 *
 * These error classes extend the base Error class to provide specific HTTP status codes
 * and error messages for different API error scenarios.
 */

/**
 * Error thrown when a requested message cannot be found in the guestbook.
 * Returns a 404 status code.
 *
 * @class MessageNotFoundError
 * @extends {Error}
 */
class MessageNotFoundError extends Error {
  status = 404;
  constructor() {
    super('Message not found, unfortunately');
  }
}

/**
 * Error thrown when a client exceeds the rate limit for API requests.
 * Returns a 429 status code.
 *
 * @class RateLimitError
 * @extends {Error}
 */
class RateLimitError extends Error {
  status = 429;
  constructor() {
    super('Too many request at once, please slow down!');
  }
}

// Rate Limiting logic.
function rateLimit(set: { status: number }, request: Request) {
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('host')?.split(':')[0] ??
    'unknown';
  const now = Date.now();
  const last = lastRequestTime.get(ip);

  if (last && now - last < RATE_LIMIT_MS) {
    throw new RateLimitError();
  }

  lastRequestTime.set(ip, now);
}

interface Message {
  id: string;
  name: string;
  text: string;
}

// TODO: Encapsulate state in a class or service object (e.g., GuestbookService) that can be instantiated and injected, improving testability and making dependencies explicit
export const messages: Message[] = [];

export const messageGroup = new Elysia().group('/messages', app =>
  app

    /**
     * Global onError messageGroup
     */
    .onError(({ error, set }) => {
      if (error instanceof MessageNotFoundError) {
        set.status = error.status;
      } else if (error instanceof RateLimitError) {
        set.status = error.status;
      }

      return {
        error: error.message,
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
          rateLimit(set, request);
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
        const index = messages.findIndex(msg => msg.id === params.id);

        if (index === -1) {
          throw new MessageNotFoundError();
        }

        messages.splice(index, 1);
        set.status = 204;
        return;
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
    author: 'Tegar Wijaya Kusuma',
    greet: INTRODUCTION,
    // Convert floating-point uptime seconds into a whole-second string for cleaner output.
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

  .listen({ port: PORT, hostname: HOSTNAME });

console.log(`Elysia listening at: http://localhost:${PORT}`);
console.log(`Check out Swagger here: http://localhost:${PORT}/swagger`);
