import type {
  Role,
  Participant,
  Room,
  VoteStats,
  CreateRoomRequest,
  CreateRoomResponse,
  RoomJoinPayload,
  RoomErrorEvent,
  VoteCastPayload,
  VoteResetPayload,
  VoteRevealPayload,
  StorySetPayload,
  DeckSetPayload,
  VoteProgressEvent,
} from '../index';

// This spec ensures the public API surface remains stable by
// type-checking imports from the package entrypoint.

describe('shared-types public API', () => {
  it('compiles with expected types', () => {
    // Role is a string union
    const r1: Role = 'host';
    const r2: Role = 'player';
    const r3: Role = 'observer';
    void r1; void r2; void r3;

    // Participant shape
    const p: Participant = { id: '1', name: 'Alice', role: 'host' };
    void p;

    // Vote stats shape
    const vs: VoteStats = { avg: 3.5, median: 3 };
    void vs;

    // Room minimal shape
    const room: Room = {
      id: 'room1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      participants: [],
    };
    void room;

    // REST contracts
    const req: CreateRoomRequest = { hostName: 'Bob' };
    const res: CreateRoomResponse = { id: 'abc', expiresAt: Date.now() };
    void req; void res;

    // WS contracts
    const join: RoomJoinPayload = { roomId: 'abc', name: 'Bob' };
    const err: RoomErrorEvent = { code: 'invalid_room', message: 'x' };
    const cast: VoteCastPayload = { value: '5' };
    const reset: VoteResetPayload = {};
    const reveal: VoteRevealPayload = {};
    const story: StorySetPayload = { story: 'Implement feature' };
    const deck: DeckSetPayload = { deckId: 'fibonacci' };
    const progress: VoteProgressEvent = { count: 1, total: 3, votedIds: ['1'] };
    void join; void err; void cast; void reset; void reveal; void story; void deck; void progress;

    expect(true).toBe(true);
  });
});
