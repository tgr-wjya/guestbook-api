/**
 * buildMessageApp()
 *
 * Endpoints:
 * ALL /root
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 * @note: Improving the overall structure of the code, moving buildMessageApp() from /index.ts to here for separation of concern.
 */

import swagger from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import {
  MessageNotFoundError,
  NotFoundException,
  RateLimitError,
} from './errors/errors';
import { MessageService } from './service/message.service';
import { buildMessageRoutes } from './routes/messages';

/**
 * buildMessageApp() function
 *
 * ALL /root
 * @buildMessageRoutes
 * @swagger
 *
 * @param group
 * @returns
 */
export function buildMessageApp(group = new MessageService()) {
  const rootApp = new Elysia()
    // Inject every request/response with custom headers
    .onAfterHandle(({ set }) => {
      set.headers['X-Powered-By'] = 'Elysia + Bun + Railway';
      set.headers['Access-Control-Allow-Origin'] = '*';
    })

    .all('/', async () => 'made with ◉‿◉')

    .use(buildMessageRoutes(group))
    .use(swagger())

    /**
     * onError() handler with custom Error class.
     *
     * @MessageNotFoundError()
     * @RateLimitError()
     * @NotFoundException()
     */
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

    /**
     * Wildcard handler.
     * Throw NotFoundException()
     */
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
