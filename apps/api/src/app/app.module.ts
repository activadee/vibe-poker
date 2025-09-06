import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
