import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { LoggingService } from './logging.service';

export function correlationMiddlewareFactory(logging: LoggingService) {
  return function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = (req.headers['x-correlation-id'] || req.headers['x-request-id']) as string | undefined;
    const cid = (header && String(header)) || (res.getHeader('x-correlation-id') as string) || randomUUID();
    res.setHeader('x-correlation-id', cid);
    logging.runWithCorrelation(cid, () => next());
  };
}

