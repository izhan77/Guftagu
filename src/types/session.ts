/**
 * Session Types
 * Defines data structures for exchanges and complete sessions
 */

export interface ExchangeData {
  exchangeNumber: number;
  childTranscript: string;
  wordCount: number;
  fillerCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  characterResponse: string;
  exchangeScore: number;
  detectedMood?: string; // optional for Phase 1
}

export interface SessionData {
  characterId: string;
  exchanges: ExchangeData[];
  totalDuration: number; // in seconds
  moodStart?: string;
  moodEnd?: string;
  topics: string[]; // e.g. ["My School", "Biryani"]
}
