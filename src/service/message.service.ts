/**
 * MessageService() class
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 */

import { type Message } from '../app';
import { MessageNotFoundError } from '../errors/errors';

/**
 * MessageService() class.
 *
 * @constructor add(): return body, throw MessageNotFoundError() if found no message
 *  @params name: string(), text: string()
 * @constructor getAll(): returns all messages available, will return empty Array if no message available.
 * @constructor remove(): return deleted Message, also throw MessageNotFoundError() for non-existent message.
 *  @params id: string()
 */
export class MessageService {
  // Make message explicitly readonly for immutability.
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
