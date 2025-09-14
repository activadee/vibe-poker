import type { CustomDeck, DeckId, Participant, Room, Story } from '@scrum-poker/shared-types';
import type { RoomsBackend } from './tokens';

export interface RoomsRepository {
  readonly backend: RoomsBackend;

  create(hostName: string, ownerSid: string, ttlMs: number): Promise<Room>;
  get(roomId: string): Promise<Room | undefined>;
  getOwner(roomId: string): Promise<string | undefined>;
  exists(roomId: string): Promise<boolean>;
  remove(roomId: string): Promise<boolean>;
  allIds(): Promise<string[]>;
  removeExpired?(): Promise<number>;

  addParticipant(roomId: string, participant: Participant): Promise<Room>;
  removeParticipant(roomId: string, participantId: string): Promise<Room | undefined>;
  castVote(roomId: string, participantId: string, value: string): Promise<Room>;
  reset(roomId: string): Promise<Room>;
  setRevealed(roomId: string, revealed: boolean): Promise<Room>;
  setStory(roomId: string, story: Story | undefined): Promise<Room>;
  setDeck(roomId: string, deckId: DeckId): Promise<Room>;
  upsertCustomDeck(roomId: string, deck: CustomDeck): Promise<Room>;
  deleteCustomDeck(roomId: string, deckId: string): Promise<Room>;
}
