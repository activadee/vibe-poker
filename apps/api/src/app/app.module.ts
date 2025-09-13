import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { RoomsModule } from './rooms/rooms.module';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [RoomsModule],
  controllers: [AppController, HealthController, MetricsController],
  providers: [AppService],
})
export class AppModule {}
