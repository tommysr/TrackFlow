import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ShipmentsSyncService } from 'src/shipments/shipments-sync.service';

@Injectable()
export class ShipmentSyncGuard implements CanActivate {
  private readonly logger = new Logger(ShipmentSyncGuard.name);

  constructor(
    private readonly shipmentSyncService: ShipmentsSyncService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('ShipmentSyncGuard - canActivate called');
    await this.shipmentSyncService.pullEvents();
    return true;
  }
}
