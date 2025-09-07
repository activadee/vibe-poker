import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CreateRoomResponse, CreateRoomRequest } from '@scrum-poker/shared-types';
import { firstValueFrom } from 'rxjs';
import { UiButtonDirective } from '../ui/button.directive';
import { UiInputDirective } from '../ui/input.directive';
import { UiCheckboxDirective } from '../ui/checkbox.directive';
import { UiCardComponent } from '../ui/card/card.component';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonDirective, UiInputDirective, UiCheckboxDirective, UiCardComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  name = '';
  roomCode = '';
  joinAsObserver = false;
  loading = signal(false);
  error = signal('');

  nameValid() {
    const v = (this.name || '').trim();
    return v.length >= 3 && v.length <= 30;
  }
  canJoin() {
    return (this.roomCode || '').trim().length > 0;
  }

  async createRoom() {
    const hostName = this.name.trim();
    if (!this.nameValid()) {
      this.error.set('Display name must be 3–30 characters');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<CreateRoomResponse>(
          '/api/rooms',
          { hostName } satisfies CreateRoomRequest
        )
      );
      if (res?.id) {
        try {
          localStorage.setItem('displayName', hostName);
        } catch (err) {
          console.warn('localStorage unavailable', err);
        }
        // Warm the Room chunk before navigating for a snappier transition
        void import('../room/room.component');
        // Navigate with a flag so the room view can auto-join the host
        this.router.navigate(['/r', res.id], { queryParams: { host: '1' } });
      } else {
        this.error.set('Unexpected response from server');
      }
    } catch (err) {
      // Keep user-facing message simple while still surfacing errors during development
      console.error('Failed to create room', err);
      this.error.set('Failed to create room');
    } finally {
      this.loading.set(false);
    }
  }

  joinRoom() {
    const input = (this.roomCode || '').trim();
    if (!input) return;
    // Save name if valid (non-blocking for join per AC)
    const hostName = (this.name || '').trim();
    if (hostName.length >= 3 && hostName.length <= 30) {
      try { localStorage.setItem('displayName', hostName); } catch (err) { console.warn('localStorage unavailable', err); }
    }
    const roomId = LobbyComponent.extractRoomId(input);
    if (!roomId) {
      this.error.set('Please enter a valid room code or link');
      return;
    }
    this.error.set('');
    const role = this.joinAsObserver ? 'observer' : 'player';
    // Warm the Room chunk before navigating for a snappier transition
    void import('../room/room.component');
    this.router.navigate(['/r', roomId], { queryParams: { role } });
  }

  static extractRoomId(input: string): string | null {
    const s = (input || '').trim();
    if (!s) return null;
    const rIndex = s.lastIndexOf('/r/');
    if (rIndex !== -1) {
      const after = s.substring(rIndex + 3);
      const id = after.split(/[?/#]/)[0];
      return id || null;
    }
    // Fallback: treat as code; normalize whitespace
    return s || null;
  }
}
