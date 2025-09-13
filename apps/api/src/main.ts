/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { sessionMiddleware } from './app/session.middleware';

type HealthzRes = { json: (body: { ok: boolean }) => void };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Attach HTTP session middleware for REST routes
  app.use(sessionMiddleware);
  // Expose an unprefixed health endpoint at /healthz for k8s/load balancers
  // This complements the Nest controller which serves /api/healthz
  app.getHttpAdapter().get('/healthz', (_req: unknown, res: HealthzRes) => {
    res.json({ ok: true });
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
