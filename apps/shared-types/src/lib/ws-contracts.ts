// WebSocket event and payload contracts
import type { DeckId, Story, Role, CustomDeck } from './domain';

export interface RoomJoinPayload {
  roomId: string;
  name: string;
  secret?: string;
  // Optional requested role for join. Server enforces permissions
  // and will only honor 'observer' (players are default; host is
  // determined by server placeholder logic).
  role?: Extract<Role, 'observer' | 'player'>;
}

export interface RoomErrorEvent {
  code: 'invalid_payload' | 'invalid_room' | 'forbidden' | 'expired' | 'rate_limited';
  message: string;
}

// Voting-related socket payloads
export interface VoteCastPayload {
  // card identifier (e.g., '1', '2', '3', '5', '8', '13', '?')
  value: string;
}

export type VoteResetPayload = Record<string, never>;

export type VoteRevealPayload = Record<string, never>;

export interface StorySetPayload {
  story: Story;
}

export interface DeckSetPayload {
  deckId: DeckId;
}

// Custom deck management (host-only)
export interface DeckUpsertPayload {
  deck: CustomDeck;
}

export interface DeckDeletePayload {
  deckId: string;
}

// Vote progress event (no values leaked)
export interface VoteProgressEvent {
  // number of participants who have cast a vote (players + host only)
  count: number;
  // total number of eligible voters in the room (players + host)
  total: number;
  // ids of participants who have voted (socket ids); used for UI badges
  votedIds: string[];
}
