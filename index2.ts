/**
 * Refactoring index2.ts:
 * In-memory Guestbook API
 *
 * Endpoints:
 * GET / - Server info + uptime
 * GET /messages - List all messages
 * POST /messages - Leave a message (name + text, validated)
 * DELETE /messages/:id - Delete a message by ID
 *
 * @author Tegar Wijaya Kusuma
 * @date 9 March 2026
 * @note clean slate is faster obviously.
 */

import swagger from '@elysiajs/swagger';
import { Elysia, t } from 'elysia';

const PORT = Bun.env.PORT || 3000;
const RATE_LIMIT_MS = 2000;
const MIN_NAME_LENGTH = 2;
const MIN_TEXT_LENGTH = 5;
const CLEANUP_INTERVAL_MS = RATE_LIMIT_MS * 10;

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
 * Error thrown when a requested message cannot be found in the guestbook.
 * Returns a 404 status code.
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
 */
class RateLimitError extends Error {
  status = 429;
  constructor() {
    super('Too many request at once, please slow down!');
  }
}

class NotFoundException extends Error {
  status = 404;
  availableEndpoints: string[];

  constructor(availableEndpoints: string[]) {
    super('Not found ¯\\_(ツ)_/¯');
    this.availableEndpoints = availableEndpoints;
  }
}

// Rate-limiting logic.
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

// Shipping-manifest, dude.
export interface Message {
  id: string;
  name: string;
  text: string;
}

// MessageService.
export class MessageService {
  // Using `readonly` to make the intended immutability explicit and avoid confusion.
  // this data is unreachable from outside after all, might as well make it readonly.
  private readonly messages: Message[] = [];

  add(name: string, text: string) {
    const message = { id: crypto.randomUUID(), name, text };
    this.messages.push(message);
    return message;
  }

  getAll() {
    return this.messages;
  }

  remove(id: string) {
    const index = this.messages.findIndex(msg => msg.id === id);
    if (index === -1) {
      throw new MessageNotFoundError();
    }
    this.messages.splice(index, 1);
  }
}

export function buildMessageApp(group = new MessageService()) {
  const rootApp = new Elysia()
    .onAfterHandle(({ set }) => {
      set.headers['X-Powered-By'] = 'Elysia + Bun + Railway';
      set.headers['Access-Control-Allow-Origin'] = '*';
    })

    .use(swagger())

    .all('/', async () => 'made with ◉‿◉')

    .group('/messages', app =>
      app

        /**
         * GET /messages
         * list all messages
         */
        .get('/', async ({ set }) => {
          set.status = 200;
          return group.getAll();
        })

        /**
         * POST /messages
         * Leave a messages here.
         */
        .post(
          '/',
          async ({ set, body }) => {
            set.status = 201;
            return group.add(body.name, body.text);
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
         * Delete a message here.
         */
        .delete(
          '/:id',
          async ({ set, params }) => {
            group.remove(params.id);
            set.status = 204;
          },
          {
            params: t.Object({
              id: t.String(),
            }),
            beforeHandle: ({ set, request }) => {
              rateLimit(set, request);
            },
          }
        )
    )

    .onError(({ error, set }) => {
      if (error instanceof MessageNotFoundError) {
        set.status = error.status;
      } else if (error instanceof RateLimitError) {
        set.status = error.status;
      } else if (error instanceof NotFoundException) {
        set.status = error.status;
        return {
          error: error.message,
          message: "This endpoint doesn't exist",
          availableEndpoints: error.availableEndpoints,
          timestamp: new Date().toISOString(),
        };
      } else {
        set.status = 500;
      }

      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    })

    .all('/*', () => {
      throw new NotFoundException([
        'GET /',
        'GET /messages',
        'POST /messages',
        'DELETE /messages/:id',
      ]);
    });

  return rootApp;
}

const app = buildMessageApp().listen(PORT);
console.log(`Listening on port ${app.server?.port}`);
