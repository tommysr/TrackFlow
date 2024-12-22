import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { IcpUser, UserRole } from '../entities/icp.user.entity';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { ShipmentsService } from 'src/shipments/shipments.service';

@Injectable()
export class ShipmentGuard implements CanActivate {
  private readonly logger = new Logger(ShipmentGuard.name);

  constructor(private readonly shipmentService: ShipmentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: IcpUser = request.user;
    const shipmentId = request.params.id || request.body.shipmentId;

    this.logger.warn(`User ${user.principal} attempted unauthorized access to shipment ${shipmentId}`);


    if (!shipmentId) {
      throw new ForbiddenException('No shipment ID provided');
    }

    const shipment = await this.shipmentService.findOneById(shipmentId);

    if (!shipment) {
      throw new ForbiddenException('Shipment not found');
    }

    // Admins have unrestricted access
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Shippers can access their own shipments
    if (user.role === UserRole.SHIPPER && shipment.shipper.principal === user.principal) {
      return true;
    }

    // Carriers can access shipments assigned to them
    if (user.role === UserRole.CARRIER && shipment.carrierPrincipal?.principal === user.principal) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this shipment');
  }
} 