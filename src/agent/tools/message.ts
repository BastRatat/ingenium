/**
 * Message tool implementation.
 */

import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
import type { OutboundMessage } from '../../bus/events.js';
import { createOutboundMessage } from '../../bus/events.js';

/**
 * Callback type for sending messages.
 */
export type SendCallback = (message: OutboundMessage) => Promise<void>;

/**
 * Options for message tool.
 */
export interface MessageToolOptions {
  /**
   * Callback for sending messages.
   */
  sendCallback?: SendCallback;

  /**
   * Default channel to send to.
   */
  defaultChannel?: string;

  /**
   * Default chat ID to send to.
   */
  defaultChatId?: string;
}

/**
 * Tool to send messages to users on chat channels.
 */
export class MessageTool extends BaseTool {
  readonly name = 'message';
  readonly description =
    'Send a message to the user. Use this when you want to communicate something.';
  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The message content to send',
      },
      channel: {
        type: 'string',
        description: 'Optional: target channel (telegram, discord, etc.)',
      },
      chat_id: {
        type: 'string',
        description: 'Optional: target chat/user ID',
      },
    },
    required: ['content'],
  };

  private sendCallback: SendCallback | undefined;
  private defaultChannel: string;
  private defaultChatId: string;

  constructor(options: MessageToolOptions = {}) {
    super();
    this.sendCallback = options.sendCallback;
    this.defaultChannel = options.defaultChannel ?? '';
    this.defaultChatId = options.defaultChatId ?? '';
  }

  /**
   * Set the current message context.
   */
  setContext(channel: string, chatId: string): void {
    this.defaultChannel = channel;
    this.defaultChatId = chatId;
  }

  /**
   * Set the callback for sending messages.
   */
  setSendCallback(callback: SendCallback): void {
    this.sendCallback = callback;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const content = params['content'];
    const channel = params['channel'];
    const chatId = params['chat_id'];

    if (typeof content !== 'string') {
      return 'Error: content must be a string';
    }

    const targetChannel =
      typeof channel === 'string' ? channel : this.defaultChannel;
    const targetChatId =
      typeof chatId === 'string' ? chatId : this.defaultChatId;

    if (!targetChannel || !targetChatId) {
      return 'Error: No target channel/chat specified';
    }

    if (!this.sendCallback) {
      return 'Error: Message sending not configured';
    }

    const msg = createOutboundMessage({
      channel: targetChannel,
      chatId: targetChatId,
      content,
    });

    try {
      await this.sendCallback(msg);
      return `Message sent to ${targetChannel}:${targetChatId}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error sending message: ${message}`;
    }
  }
}

/**
 * Create a message tool.
 */
export function createMessageTool(options?: MessageToolOptions): MessageTool {
  return new MessageTool(options);
}
