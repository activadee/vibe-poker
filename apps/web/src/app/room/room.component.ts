import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss'],
})
export class RoomComponent {
  private readonly route = inject(ActivatedRoute);
  roomId = signal<string>('');
  copied = signal(false);
  url = '';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.roomId.set(params.get('roomId') ?? '');
      this.copied.set(false);
    });
    this.url = location.href;
  }

  async copyLink() {
    await navigator.clipboard.writeText(this.url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
