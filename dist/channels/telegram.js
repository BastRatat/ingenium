/**
 * Telegram channel implementation using Telegraf.
 */
import { Telegraf } from 'telegraf';
import { BaseChannel } from './base.js';
import { GroqTranscriptionProvider } from '../providers/transcription.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
/**
 * Convert markdown to Telegram-safe HTML.
 */
function markdownToTelegramHtml(text) {
    if (!text)
        return '';
    // 1. Extract and protect code blocks
    const codeBlocks = [];
    let result = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
        codeBlocks.push(code);
        return `\x00CB${codeBlocks.length - 1}\x00`;
    });
    // 2. Extract and protect inline code
    const inlineCodes = [];
    result = result.replace(/`([^`]+)`/g, (_, code) => {
        inlineCodes.push(code);
        return `\x00IC${inlineCodes.length - 1}\x00`;
    });
    // 3. Headers # Title -> just the title text
    result = result.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    // 4. Blockquotes > text -> just the text
    result = result.replace(/^>\s*(.*)$/gm, '$1');
    // 5. Escape HTML special characters
    result = result.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 6. Links [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // 7. Bold **text** or __text__
    result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    result = result.replace(/__(.+?)__/g, '<b>$1</b>');
    // 8. Italic _text_ (avoid matching inside words)
    result = result.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<i>$1</i>');
    // 9. Strikethrough ~~text~~
    result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
    // 10. Bullet lists
    result = result.replace(/^[-*]\s+/gm, '• ');
    // 11. Restore inline code
    for (let i = 0; i < inlineCodes.length; i++) {
        const escaped = (inlineCodes[i] ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        result = result.replace(`\x00IC${i}\x00`, `<code>${escaped}</code>`);
    }
    // 12. Restore code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
        const escaped = (codeBlocks[i] ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        result = result.replace(`\x00CB${i}\x00`, `<pre><code>${escaped}</code></pre>`);
    }
    return result;
}
/**
 * Get file extension based on media type and MIME type.
 */
function getExtension(mediaType, mimeType) {
    if (mimeType) {
        const extMap = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.m4a',
        };
        if (mimeType in extMap) {
            return extMap[mimeType] ?? '';
        }
    }
    const typeMap = {
        image: '.jpg',
        voice: '.ogg',
        audio: '.mp3',
        file: '',
    };
    return typeMap[mediaType] ?? '';
}
/**
 * Telegram channel using Telegraf with long polling.
 */
export class TelegramChannel extends BaseChannel {
    name = 'telegram';
    bot = null;
    telegramConfig;
    transcriber = null;
    mediaDir;
    constructor(config, bus, groqApiKey) {
        super(config, bus);
        this.telegramConfig = config;
        this.mediaDir = join(homedir(), '.ingenium', 'media');
        if (groqApiKey) {
            this.transcriber = new GroqTranscriptionProvider(groqApiKey);
        }
    }
    async start() {
        if (!this.telegramConfig.token) {
            console.error('Telegram bot token not configured');
            return;
        }
        this._running = true;
        this.bot = new Telegraf(this.telegramConfig.token);
        // Handle /start command
        this.bot.command('start', async (ctx) => {
            const user = ctx.from;
            if (user) {
                await ctx.reply(`Hi ${user.first_name}! I'm ingenium.\n\nSend me a message and I'll respond!`);
            }
        });
        // Handle text messages
        this.bot.on('text', async (ctx) => {
            await this.handleTelegramMessage(ctx);
        });
        // Handle photos
        this.bot.on('photo', async (ctx) => {
            await this.handleTelegramMessage(ctx);
        });
        // Handle voice messages
        this.bot.on('voice', async (ctx) => {
            await this.handleTelegramMessage(ctx);
        });
        // Handle documents
        this.bot.on('document', async (ctx) => {
            await this.handleTelegramMessage(ctx);
        });
        console.log('Starting Telegram bot (polling mode)...');
        try {
            // Launch the bot
            await this.bot.launch();
            console.log('Telegram bot connected');
            // Keep running until stopped
            while (this._running) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        catch (error) {
            console.error('Telegram bot error:', error);
            this._running = false;
        }
    }
    async stop() {
        this._running = false;
        if (this.bot) {
            this.bot.stop('SIGTERM');
            this.bot = null;
        }
    }
    async send(msg) {
        if (!this.bot) {
            console.warn('Telegram bot not running');
            return;
        }
        try {
            const chatId = parseInt(msg.chatId, 10);
            if (isNaN(chatId)) {
                console.error(`Invalid chat_id: ${msg.chatId}`);
                return;
            }
            const htmlContent = markdownToTelegramHtml(msg.content);
            try {
                await this.bot.telegram.sendMessage(chatId, htmlContent, {
                    parse_mode: 'HTML',
                });
            }
            catch {
                // Fallback to plain text if HTML parsing fails
                await this.bot.telegram.sendMessage(chatId, msg.content);
            }
        }
        catch (error) {
            console.error('Error sending Telegram message:', error);
        }
    }
    async handleTelegramMessage(ctx) {
        const message = ctx.message;
        const user = ctx.from;
        if (!message || !user)
            return;
        const chatId = message.chat.id;
        // Build sender ID with optional username
        let senderId = String(user.id);
        if (user.username) {
            senderId = `${senderId}|${user.username}`;
        }
        // Build content
        const contentParts = [];
        const mediaPaths = [];
        // Text content
        if ('text' in message && message.text) {
            contentParts.push(message.text);
        }
        if ('caption' in message && message.caption) {
            contentParts.push(message.caption);
        }
        const isMediaFile = (obj) => typeof obj === 'object' &&
            obj !== null &&
            'file_id' in obj &&
            typeof obj['file_id'] === 'string';
        let mediaFile = null;
        let mediaType = null;
        if ('photo' in message && message.photo && message.photo.length > 0) {
            // Get largest photo
            const photo = message.photo[message.photo.length - 1];
            if (photo && isMediaFile(photo)) {
                mediaFile = photo;
                mediaType = 'image';
            }
        }
        else if ('voice' in message && isMediaFile(message.voice)) {
            mediaFile = message.voice;
            mediaType = 'voice';
        }
        else if ('audio' in message && isMediaFile(message.audio)) {
            mediaFile = message.audio;
            mediaType = 'audio';
        }
        else if ('document' in message && isMediaFile(message.document)) {
            mediaFile = message.document;
            mediaType = 'file';
        }
        // Download media if present
        if (mediaFile && mediaType && this.bot) {
            try {
                const fileLink = await ctx.telegram.getFileLink(mediaFile.file_id);
                const ext = getExtension(mediaType, 'mime_type' in mediaFile ? mediaFile.mime_type : undefined);
                // Ensure media directory exists
                await mkdir(this.mediaDir, { recursive: true });
                const filePath = join(this.mediaDir, `${mediaFile.file_id.slice(0, 16)}${ext}`);
                // Download the file
                const response = await fetch(fileLink.href);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    await writeFile(filePath, Buffer.from(buffer));
                    mediaPaths.push(filePath);
                    // Handle voice/audio transcription
                    if ((mediaType === 'voice' || mediaType === 'audio') && this.transcriber) {
                        const transcription = await this.transcriber.transcribe(filePath);
                        if (transcription) {
                            console.log(`Transcribed ${mediaType}: ${transcription.slice(0, 50)}...`);
                            contentParts.push(`[transcription: ${transcription}]`);
                        }
                        else {
                            contentParts.push(`[${mediaType}: ${filePath}]`);
                        }
                    }
                    else {
                        contentParts.push(`[${mediaType}: ${filePath}]`);
                    }
                    console.log(`Downloaded ${mediaType} to ${filePath}`);
                }
                else {
                    contentParts.push(`[${mediaType}: download failed]`);
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`Failed to download media: ${errorMsg}`);
                contentParts.push(`[${mediaType}: download failed]`);
            }
        }
        const content = contentParts.length > 0 ? contentParts.join('\n') : '[empty message]';
        const messageOptions = {
            senderId,
            chatId: String(chatId),
            content,
            metadata: {
                messageId: message.message_id,
                userId: user.id,
                username: user.username,
                firstName: user.first_name,
                isGroup: message.chat.type !== 'private',
            },
        };
        if (mediaPaths.length > 0) {
            messageOptions.media = mediaPaths;
        }
        await this.handleMessage(messageOptions);
    }
}
/**
 * Create a Telegram channel.
 */
export function createTelegramChannel(config, bus, groqApiKey) {
    return new TelegramChannel(config, bus, groqApiKey);
}
//# sourceMappingURL=telegram.js.map