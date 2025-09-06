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
}

// REST contracts
export interface CreateRoomRequest {
  hostName: string;
}

export interface CreateRoomResponse {
  id: string;
  expiresAt: number;
}
