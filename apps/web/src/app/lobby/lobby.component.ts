import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CreateRoomResponse, CreateRoomRequest } from '@scrum-poker/shared-types';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  name = '';
  loading = signal(false);
  error = signal('');

  async createRoom() {
    const hostName = this.name.trim();
    if (!hostName) {
      this.error.set('Please enter your display name');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    try {
      const res = await this.http
        .post<CreateRoomResponse>('/api/rooms', { hostName } satisfies CreateRoomRequest)
        .toPromise();
      if (res?.id) {
        this.router.navigate(['/r', res.id]);
      } else {
        this.error.set('Unexpected response from server');
      }
    } catch (e) {
      this.error.set('Failed to create room');
    } finally {
      this.loading.set(false);
    }
  }
}
