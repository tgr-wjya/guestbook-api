/**
 * Type-safety for Message
 *
 * @author Tegar Wijaya Kusuma
 * @date 12 March 2026
 * @note Moving Message interface from src/app.ts to its own dedicated types file.
 * "the app layer should depend on the service, not the other way around"
 */

// Type-safety for Message guestbook.
export interface Message {
  id: string;
  name: string;
  text: string;
}
