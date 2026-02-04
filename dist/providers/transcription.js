/**
 * Voice transcription provider using Groq.
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
/**
 * Voice transcription provider using Groq's Whisper API.
 *
 * Groq offers extremely fast transcription with a generous free tier.
 */
export class GroqTranscriptionProvider {
    apiKey;
    apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
    constructor(apiKey) {
        this.apiKey = apiKey ?? process.env['GROQ_API_KEY'] ?? '';
    }
    /**
     * Transcribe an audio file using Groq.
     *
     * @param filePath - Path to the audio file.
     * @returns Transcribed text, or empty string on error.
     */
    async transcribe(filePath) {
        if (!this.apiKey) {
            console.warn('Groq API key not configured for transcription');
            return '';
        }
        try {
            const fileBuffer = await readFile(filePath);
            const fileName = basename(filePath);
            const formData = new FormData();
            formData.append('file', new Blob([fileBuffer]), fileName);
            formData.append('model', 'whisper-large-v3');
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: formData,
                signal: AbortSignal.timeout(60000),
            });
            if (!response.ok) {
                console.error(`Groq transcription error: HTTP ${response.status}`);
                return '';
            }
            const data = (await response.json());
            return data.text ?? '';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Groq transcription error: ${message}`);
            return '';
        }
    }
}
/**
 * Create a Groq transcription provider.
 */
export function createGroqTranscriptionProvider(apiKey) {
    return new GroqTranscriptionProvider(apiKey);
}
//# sourceMappingURL=transcription.js.map