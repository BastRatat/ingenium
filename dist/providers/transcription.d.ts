/**
 * Voice transcription provider using Groq.
 */
/**
 * Voice transcription provider using Groq's Whisper API.
 *
 * Groq offers extremely fast transcription with a generous free tier.
 */
export declare class GroqTranscriptionProvider {
    private readonly apiKey;
    private readonly apiUrl;
    constructor(apiKey?: string);
    /**
     * Transcribe an audio file using Groq.
     *
     * @param filePath - Path to the audio file.
     * @returns Transcribed text, or empty string on error.
     */
    transcribe(filePath: string): Promise<string>;
}
/**
 * Create a Groq transcription provider.
 */
export declare function createGroqTranscriptionProvider(apiKey?: string): GroqTranscriptionProvider;
//# sourceMappingURL=transcription.d.ts.map