import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { Room, RoomErrorEvent, VoteProgressEvent, Participant, VoteStats } from '@scrum-poker/shared-types';
import { io, Socket } from 'socket.io-client';
import { VoteCardsComponent } from '../vote-cards/vote-cards.component';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VoteCardsComponent],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss'],
})
export class RoomComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  roomId = signal<string>('');
  copied = signal(false);
  url = '';

  name = '';
  // Join preferences
  joinAsObserver = false;
  error = signal('');
  joined = signal(false);
  participants = signal<Room['participants']>([]);
  revealed = signal(false);
  story = signal('');
  deckId = signal<'fibonacci' | string>('fibonacci');
  votes = signal<Record<string, string>>({});
  // FR-009 results stats
  stats = signal<VoteStats | null>(null);
  // FR-006 progress state
  voteCount = signal(0);
  voteTotal = signal(0);
  votedIds = signal<string[]>([]);

  private socket?: Socket;
  private socketId = signal<string>('');

  myRole = computed(() => {
    const id = this.socketId();
    const me = this.participants().find((p) => p.id === id);
    return me?.role ?? 'player';
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('roomId') ?? '';
      this.roomId.set(id);
      this.url = location.href;
      this.resetState();
      const saved = localStorage.getItem('displayName') ?? '';
      if (saved) {
        this.name = saved;
      }
      // Apply role preference from query param if present
      const role = this.route.snapshot.queryParamMap.get('role');
      this.joinAsObserver = role === 'observer';
      // Do not auto-join: allow user to confirm role before joining
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private static readonly SOCKET_IO_PATH = '/api/socket.io';

  private connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io({ path: RoomComponent.SOCKET_IO_PATH });
    this.setupSocketListeners(this.socket);
    return this.socket;
  }

  private disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  private resetState() {
    this.copied.set(false);
    this.error.set('');
    this.joined.set(false);
    this.participants.set([]);
    this.disconnect();
  }

  private setupSocketListeners(socket: Socket) {
    socket.on('connect', () => {
      if (socket.id) this.socketId.set(socket.id);
    });
    socket.on('room:error', (err: RoomErrorEvent | { message?: string } | undefined) => {
      const message = err && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Something went wrong joining the room';
      this.error.set(message);
    });
    socket.on('room:state', (room: Room) => {
      if (!room || room.id !== this.roomId()) return;
      this.participants.set(room.participants ?? []);
      this.revealed.set(!!room.revealed);
      this.story.set(room.story ?? '');
      this.deckId.set(room.deckId ?? 'fibonacci');
      this.votes.set(room.votes ?? {});
      this.stats.set(room.revealed && room.stats ? room.stats : null);
      this.joined.set(true);
    });
    // FR-006: vote progress stream
    socket.on('vote:progress', (p: VoteProgressEvent | undefined) => {
      const progress = p ?? { count: 0, total: 0, votedIds: [] };
      this.voteCount.set(progress.count ?? 0);
      this.voteTotal.set(progress.total ?? 0);
      this.votedIds.set(progress.votedIds ?? []);
    });
  }

  join() {
    const name = (this.name || '').trim();
    if (!name) {
      this.error.set('Please enter your display name');
      return;
    }
    this.error.set('');
    localStorage.setItem('displayName', name);
    const socket = this.connect();
    const payload: any = { roomId: this.roomId(), name };
    if (this.joinAsObserver) payload.role = 'observer';
    socket.emit('room:join', payload);
  }

  leave() {
    this.disconnect();
    this.joined.set(false);
    this.participants.set([]);
    this.error.set('');
    this.router.navigateByUrl('/');
  }

  async copyLink() {
    await navigator.clipboard.writeText(this.url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  castVote(value: string) {
    if (this.myRole() === 'observer') return; // UI-guard
    const socket = this.connect();
    socket.emit('vote:cast', { value });
  }

  reveal() {
    const socket = this.connect();
    socket.emit('vote:reveal', {});
  }

  resetVotes() {
    // Host-only action in UI; ask for confirmation
    const ok = window.confirm('Reset votes for this round?');
    if (!ok) return;
    const socket = this.connect();
    socket.emit('vote:reset', {});
  }

  // UI helper for templates
  hasVoted(p: Participant): boolean {
    if (this.revealed()) return false;
    const ids = this.votedIds();
    return !!ids && ids.includes(p.id);
  }
}
