/**
 * Entry point for /app.ts
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

import { buildMessageApp } from './src/app';
import { PORT, HOSTNAME } from './src/config';

const app = buildMessageApp().listen({ port: PORT, hostname: HOSTNAME });

console.log(`Listening on port ${app.server?.port}`);
