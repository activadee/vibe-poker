// Core domain types shared across API and Web

export type Role = 'host' | 'player' | 'observer';

export interface Participant {
  id: string;
  name: string;
  role: Role;
}

// Supported deck identifiers (extendable)
export type DeckId = 'fibonacci' | 'tshirt' | string;

// Statistics computed when votes are revealed
export interface VoteStats {
  // Average of numeric cards, rounded to 1 decimal
  avg: number;
  // Median of numeric cards (even -> mean of middle 2), rounded to 1 decimal
  median: number;
}

export interface Story {
  id: string;
  title: string;
  notes?: string;
}

export interface Room {
  id: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  participants: Participant[];
  // Optional voting state
  story?: Story;
  deckId?: DeckId;
  revealed?: boolean;
  // votes keyed by participant id; values are card identifiers
  votes?: Record<string, string>;
  // Derived statistics when revealed
  stats?: VoteStats;
}
