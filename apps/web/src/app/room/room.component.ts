import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { Room, RoomErrorEvent } from '@scrum-poker/shared-types';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  error = signal('');
  joined = signal(false);
  participants = signal<Room['participants']>([]);
  revealed = signal(false);
  story = signal('');
  deckId = signal<'fibonacci' | string>('fibonacci');
  readonly deck = ['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'];
  votes = signal<Record<string, string>>({});

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
        // defer join slightly to allow view to settle
        setTimeout(() => this.join(), 0);
      }
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
      this.deckId.set((room.deckId as any) ?? 'fibonacci');
      this.votes.set(room.votes ?? {});
      this.joined.set(true);
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
    socket.emit('room:join', { roomId: this.roomId(), name });
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
    const socket = this.connect();
    socket.emit('vote:reset', {});
  }
}
