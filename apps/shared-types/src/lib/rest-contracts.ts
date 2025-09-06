// REST request/response contracts

export interface CreateRoomRequest {
  hostName: string;
}

export interface CreateRoomResponse {
  id: string;
  expiresAt: number;
}

