import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RoomsModule } from './rooms.module';
import { RoomsController } from './rooms.controller';

describe('RoomsController (unit)', () => {
  let controller: RoomsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoomsModule],
    }).compile();
    controller = moduleRef.get(RoomsController);
  });

  it('create() returns human-readable id', async () => {
    const req = { session: {} } as unknown as { session?: { uid?: string } };
    const res = await controller.create({ hostName: 'Alice' } as any, req as any);
    expect(res.id).toMatch(/^[A-HJ-NP-Z]{4}-\d{4}$/);
    expect(typeof res.expiresAt).toBe('number');
  });

  it('throws 400 when hostName missing', async () => {
    const req = { session: {} } as unknown as { session?: { uid?: string } };
    await expect(controller.create({} as any, req as any)).rejects.toThrow(BadRequestException);
  });
});
