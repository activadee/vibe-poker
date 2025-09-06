// Shared domain types used across API and Web

export type Role = 'host' | 'player' | 'observer';

export interface Participant {
  id: string;
  name: string;
  role: Role;
}

export interface Room {
  id: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  participants: Participant[];
  // Optional voting state (introduced in FR-004)
  story?: string;
  deckId?: 'fibonacci' | 'tshirt' | string;
  revealed?: boolean;
  // votes keyed by participant id; values are card identifiers
  votes?: Record<string, string>;
  // FR-009: Derived statistics when revealed
  stats?: VoteStats;
}

// REST contracts
export interface CreateRoomRequest {
  hostName: string;
}

export interface CreateRoomResponse {
  id: string;
  expiresAt: number;
}

// WebSocket contracts
export interface RoomJoinPayload {
  roomId: string;
  name: string;
  secret?: string;
}

export interface RoomErrorEvent {
  code: 'invalid_payload' | 'invalid_room' | 'forbidden';
  message: string;
}

// Socket event contracts (introduced in FR-004)
export interface VoteCastPayload {
  // card identifier (e.g., '1', '2', '3', '5', '8', '13', '?')
  value: string;
}

export type VoteResetPayload = Record<string, never>;

export type VoteRevealPayload = Record<string, never>;

export interface StorySetPayload {
  story: string;
}

export interface DeckSetPayload {
  deckId: 'fibonacci' | 'tshirt' | string;
}

// FR-006: Vote progress event (no values leaked)
export interface VoteProgressEvent {
  // number of participants who have cast a vote (players + host only)
  count: number;
  // total number of eligible voters in the room (players + host)
  total: number;
  // ids of participants who have voted (socket ids); used for UI badges
  votedIds: string[];
}

// FR-009: Vote statistics (computed on the server when revealed)
export interface VoteStats {
  // Average of numeric cards, rounded to 1 decimal
  avg: number;
  // Median of numeric cards (even -> mean of middle 2), rounded to 1 decimal
  median: number;
}
