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
