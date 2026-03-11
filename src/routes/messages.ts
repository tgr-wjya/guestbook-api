/**
 * messages Group handler
 *
 * Endpoints:
 * GET /messages - List all messages
 * POST /messages - Leave a message (name + text, validated)
 * DELETE /messages/:id - Delete a message by ID
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 */

import { Elysia, t } from 'elysia';
import { MessageService } from '../service/message.service';
import { MIN_NAME_LENGTH, MIN_TEXT_LENGTH, rateLimit } from '../config';

/**
 * /messages group
 *
 * GET /messages
 * POST /messages
 * DELETE /messages
 */
export function buildMessageRoutes(group: MessageService) {
  return new Elysia().group('/messages', app =>
    app

      /**
       * GET /messages
       * list all messages
       */
      .get('/', async ({ set }) => {
        const getMessages = group.getAll();

        set.status = 200;
        return getMessages;
      })

      /**
       * POST /messages
       * Leave a messages here.
       */
      .post(
        '/',
        async ({ set, body }) => {
          const created = group.add(body.name, body.text);

          set.status = 201;
          return created;
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
  );
}
