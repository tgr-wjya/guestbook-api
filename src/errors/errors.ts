/**
 * All custom error classes
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

// Error thrown when a requested message cannot be found.
export class MessageNotFoundError extends Error {
  status = 404;
  constructor() {
    super('Message not found, unfortunately');
  }
}

// Error thrown when a client exceeds the rate limit for API requests
export class RateLimitError extends Error {
  status = 429;
  constructor() {
    super('Too many request at once, please slow down!');
  }
}

// Error thrown when an endpoint doesn't exist, wildcard error handler.
export class NotFoundException extends Error {
  status = 404;
  availableEndpoints: string[];

  constructor(availableEndpoints: string[]) {
    super('Not Found');
    this.availableEndpoints = availableEndpoints;
  }
}
