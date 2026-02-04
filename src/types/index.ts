/**
 * Shared type definitions for ingenium.
 */

/**
 * Logger interface compatible with pino.
 */
export interface Logger {
  info(obj: object, msg?: string): void;
  info(msg: string): void;
  error(obj: object, msg?: string): void;
  error(msg: string): void;
  warn(obj: object, msg?: string): void;
  warn(msg: string): void;
  debug(obj: object, msg?: string): void;
  debug(msg: string): void;
}

/**
 * Session key format: "channel:chatId"
 */
export type SessionKeyFormat = `${string}:${string}`;

/**
 * Result of parsing a session key.
 */
export interface ParsedSessionKey {
  channel: string;
  chatId: string;
}

/**
 * Channel types supported by ingenium.
 */
export type ChannelType = 'telegram' | 'whatsapp' | 'cli' | 'system';
