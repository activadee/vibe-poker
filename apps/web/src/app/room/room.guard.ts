import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';

// Ensures a non-empty :roomId param exists; otherwise redirects to lobby
export const roomGuard: CanActivateFn = (route): boolean | UrlTree => {
  const router = inject(Router);
  const id = (route.paramMap.get('roomId') || '').trim();
  if (!id) {
    return router.createUrlTree(['/']);
  }
  return true;
};

