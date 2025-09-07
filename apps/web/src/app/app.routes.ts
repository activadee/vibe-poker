import { Route } from '@angular/router';
import { roomGuard } from './room/room.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: 'r/:roomId',
    canActivate: [roomGuard],
    loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
  },
];
