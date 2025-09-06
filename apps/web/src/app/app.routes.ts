import { Route } from '@angular/router';
import { LobbyComponent } from './lobby/lobby.component';
import { RoomComponent } from './room/room.component';

export const appRoutes: Route[] = [
  { path: '', component: LobbyComponent },
  { path: 'r/:roomId', component: RoomComponent },
];
