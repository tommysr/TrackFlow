import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IcpUser, UserRole } from '../entities/icp.user.entity';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { ShipmentsService } from 'src/shipments/shipments.service';
import { ShipmentsSyncService } from 'src/shipments/shipments-sync.service';

@Injectable()
export class ShipmentGuard implements CanActivate {
  private readonly logger = new Logger(ShipmentGuard.name);

  constructor(
    private readonly shipmentService: ShipmentsService,
    private readonly shipmentSyncService: ShipmentsSyncService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: IcpUser = request.user;
    const shipmentId = request.params.id || request.body.shipmentId;

    this.logger.log(`User ${user.principal} attempted access to shipment ${shipmentId}`);

    if (!shipmentId) {
      throw new ForbiddenException('No shipment ID provided');
    }

    const shipment = await this.shipmentService.findOneById(shipmentId);

    if (!shipment) {
      throw new ForbiddenException('Shipment not found');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('requiredRoles', requiredRoles);

    if (!requiredRoles) {
      return true;
    }

    if (requiredRoles.includes(UserRole.ADMIN)) {
      return true;
    }

    if (requiredRoles.includes(UserRole.SHIPPER) && shipment.shipper.principal === user.principal) {
      this.logger.log(`User ${user.principal} is assigned to shipper ${shipment.shipper.principal}`);
      return true;
    }

    if (requiredRoles.includes(UserRole.CARRIER) && shipment.carrier?.principal === user.principal) {
      this.logger.log(`User ${user.principal} is assigned to carrier ${shipment.carrier?.principal}`);
      return true;
    }

    throw new ForbiddenException('You do not have access to this shipment');
  }
} 