import {
  Component,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
  HostListener,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type {
  Room,
  RoomErrorEvent,
  VoteProgressEvent,
  Participant,
  VoteStats,
  Story,
  RoomJoinPayload,
} from '@scrum-poker/shared-types';
import type { DeckId } from '@scrum-poker/shared-types';
import { io, Socket } from 'socket.io-client';
import { VoteCardsComponent } from '../vote-cards/vote-cards.component';
import { UiButtonDirective } from '../ui/button.directive';
import { UiInputDirective } from '../ui/input.directive';
import { UiCheckboxDirective } from '../ui/checkbox.directive';
import { UiCardComponent } from '../ui/card/card.component';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    VoteCardsComponent,
    UiButtonDirective,
    UiInputDirective,
    UiCheckboxDirective,
    UiCardComponent,
  ],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss'],
})
export class RoomComponent implements OnDestroy {
  @ViewChild(VoteCardsComponent) private cards?: VoteCardsComponent;
  @ViewChild('joinNameInput') private joinNameInput?: ElementRef<HTMLInputElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  roomId = signal<string>('');
  copied = signal(false);
  // Base URL for sharing; we expose explicit role variants instead of a bare URL
  url = '';
  readonly shareUrlObserver = computed(() => this.buildShareUrl('observer'));
  readonly shareUrlPlayer = computed(() => this.buildShareUrl('player'));

  name = '';
  // Join preferences
  joinAsObserver = false;
  error = signal('');
  joined = signal(false);
  participants = signal<Room['participants']>([]);
  revealed = signal(false);
  story = signal<Story | null>(null);
  storyTitleModel = '';
  storyNotesModel = '';
  deckId = signal<DeckId>('fibonacci');
  votes = signal<Record<string, string>>({});
  // FR-009 results stats
  stats = signal<VoteStats | null>(null);
  // FR-006 progress state
  voteCount = signal(0);
  voteTotal = signal(0);
  votedIds = signal<string[]>([]);
  // Join modal visibility
  showJoinModal = signal(false);

  private socket?: Socket;
  private socketId = signal<string>('');

  // NFR-001: reconnect notice
  showReconnectBanner = signal(false);
  reconnectMessage = signal('');
  reconnectVariant = signal<'info' | 'success'>('info');
  private wasDisconnected = false;

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
      const qp = this.route.snapshot.queryParamMap;
      const role = qp.get('role');
      this.joinAsObserver = role === 'observer';
      // Show modal whenever no saved name exists, regardless of role
      const shouldShowModal = !saved;
      this.showJoinModal.set(shouldShowModal);
      // Auto-join when a saved name exists (host/player/observer). Host elevation handled server-side.
      if (!shouldShowModal) {
        setTimeout(() => this.join());
      }
    });
    // Focus the name input when the join modal is shown
    effect(() => {
      if (this.showJoinModal()) {
        setTimeout(() => this.joinNameInput?.nativeElement?.focus());
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
      // If we previously lost the connection, surface a brief reconnected banner
      if (this.wasDisconnected) {
        this.reconnectVariant.set('success');
        this.reconnectMessage.set('Reconnected to server. Rooms are ephemeral and may reset.');
        this.showReconnectBanner.set(true);
        // Auto-rejoin room with prior identity
        const nm = (this.name || localStorage.getItem('displayName') || '').trim();
        const rid = this.roomId();
        if (nm && rid) {
          const payload: RoomJoinPayload = { roomId: rid, name: nm };
          if (this.joinAsObserver) payload.role = 'observer';
          socket.emit('room:join', payload);
        }
        this.wasDisconnected = false;
        // Auto-hide after a short delay
        setTimeout(() => this.showReconnectBanner.set(false), 4000);
      }
    });
    socket.on(
      'room:error',
      (err: RoomErrorEvent | { message?: string } | undefined) => {
        const message =
          err && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Something went wrong joining the room';
        this.error.set(message);
      }
    );
    socket.on('room:state', (room: Room) => {
      if (!room || room.id !== this.roomId()) return;
      this.participants.set(room.participants ?? []);
      this.revealed.set(!!room.revealed);
      this.story.set(room.story ?? null);
      // Seed editor models for host convenience
      this.storyTitleModel = room.story?.title ?? '';
      this.storyNotesModel = room.story?.notes ?? '';
      const prevDeck = this.deckId();
      const nextDeck: DeckId = (room.deckId ?? 'fibonacci') as DeckId;
      this.deckId.set(nextDeck);
      // Clear local selection if deck changed so UI doesn't show a stale highlight
      if (prevDeck !== nextDeck) {
        this.cards?.clearSelection();
      }
      this.votes.set(room.votes ?? {});
      this.stats.set(room.revealed && room.stats ? room.stats : null);
      this.joined.set(true);
      // Ensure any pending join modal is closed after we join
      this.showJoinModal.set(false);
    });
    // FR-006: vote progress stream
    socket.on('vote:progress', (p: VoteProgressEvent | undefined) => {
      const progress = p ?? { count: 0, total: 0, votedIds: [] };
      this.voteCount.set(progress.count ?? 0);
      this.voteTotal.set(progress.total ?? 0);
      this.votedIds.set(progress.votedIds ?? []);
    });
    // Show reconnect banner when disconnected; socket.io will auto-retry
    socket.on('disconnect', () => {
      this.wasDisconnected = true;
      this.reconnectVariant.set('info');
      this.reconnectMessage.set('Connection lost. Attempting to reconnect…');
      this.showReconnectBanner.set(true);
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
    let payload: RoomJoinPayload = {
      roomId: this.roomId(),
      name,
    };
    if (this.joinAsObserver) {
      payload = { ...payload, role: 'observer' };
    }
    socket.emit('room:join', payload);
    // Close modal once join is initiated; joined state will be reflected on room:state
    this.showJoinModal.set(false);
  }

  leave() {
    this.disconnect();
    this.joined.set(false);
    this.participants.set([]);
    this.error.set('');
    this.router.navigateByUrl('/');
  }

  async copyLink() {
    const invite = [
      'Join this room:',
      `Join as observer: ${this.shareUrlObserver()}`,
      `Join as user: ${this.shareUrlPlayer()}`,
    ].join('\n');
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === 'function') {
        await nav.share({ title: 'Planning Poker', text: invite });
      } else if (navigator.clipboard && 'writeText' in navigator.clipboard) {
        await navigator.clipboard.writeText(invite);
      } else {
        const ta = document.createElement('textarea');
        ta.value = invite;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
    } catch (err) {
      console.warn('Share/copy failed', err);
    }
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

  revote() {
    // Clear local selection highlight immediately to avoid stale UI
    this.cards?.clearSelection();
    const socket = this.connect();
    socket.emit('vote:reset', {});
  }
  private genStoryId(): string {
    return `S-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  saveStory() {
    if (this.myRole() !== 'host') return;
    const title = (this.storyTitleModel ?? '').trim();
    const notes = (this.storyNotesModel ?? '').toString();
    if (!title) return;
    const socket = this.connect();
    const existing = this.story();
    const payload: Story = {
      id: existing?.id || this.genStoryId(),
      title,
      ...(notes.trim() ? { notes } : {}),
    };
    socket.emit('story:set', { story: payload });
  }

  // UI helper for templates
  hasVoted(p: Participant): boolean {
    if (this.revealed()) return false;
    const ids = this.votedIds();
    return !!ids && ids.includes(p.id);
  }

  // FR-017: Deck presets mapping used to render vote cards
  private static readonly FIBONACCI: string[] = [
    '1',
    '2',
    '3',
    '5',
    '8',
    '13',
    '21',
    '?',
    '☕',
  ];
  private static readonly TSHIRT: string[] = [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    '?',
    '☕',
  ];

  deckValues() {
    const d = this.deckId();
    if (d === 'tshirt') return RoomComponent.TSHIRT;
    // Default to Fibonacci if unknown deck id
    return RoomComponent.FIBONACCI;
  }

  // Host action: change deck preset for the room
  changeDeck(deckId: DeckId) {
    if (this.myRole() !== 'host') return;
    const socket = this.connect();
    socket.emit('deck:set', { deckId });
  }

  private buildShareUrl(role: 'observer' | 'player'): string {
    const origin = typeof location !== 'undefined' ? location.origin : '';
    const base = `${origin}/r/${encodeURIComponent(this.roomId())}`;
    const query = `role=${encodeURIComponent(role)}`;
    return `${base}?${query}`;
  }

  // Allow closing the modal with Escape (navigates back to lobby)
  @HostListener('window:keydown.escape', ['$event'])
  onEscape(ev: Event) {
    if (this.showJoinModal()) {
      ev.preventDefault();
      this.router.navigateByUrl('/');
    }
  }
}
