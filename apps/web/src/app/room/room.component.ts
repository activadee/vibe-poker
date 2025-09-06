import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { Room } from '@scrum-poker/shared-types';
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

  private socket?: Socket;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.roomId.set(params.get('roomId') ?? '');
      this.copied.set(false);
      this.url = location.href;
      this.error.set('');
      this.joined.set(false);
      this.participants.set([]);
      this.disconnect();
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

  private connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io({ path: '/api/socket.io' });
    this.socket.on('room:error', (err: { message: string }) => {
      this.error.set(err?.message || 'Something went wrong joining the room');
    });
    this.socket.on('room:state', (room: Room) => {
      if (!room || room.id !== this.roomId()) return;
      this.participants.set(room.participants ?? []);
      this.joined.set(true);
    });
    return this.socket;
  }

  private disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
    }
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
}
