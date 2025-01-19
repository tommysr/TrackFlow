// import { 
//   WebSocketGateway, 
//   WebSocketServer, 
//   SubscribeMessage, 
//   MessageBody, 
//   ConnectedSocket, 
//   OnGatewayConnection, 
//   OnGatewayDisconnect,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { Logger, UnauthorizedException } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { RoutesService } from '../../routes/routes.service';
// import { RouteTrackingService } from '../../core/services/route-tracking.service';
// import { Shipment } from '../../shipments/entities/shipment.entity';
// import { Route } from 'src/aggregation/entities/route.entity';

// interface LocationUpdate {
//   latitude: number;
//   longitude: number;
//   timestamp: Date;
// }

// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
// })
// export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   server: Server;

//   private readonly logger = new Logger(LocationGateway.name);
//   private readonly connectedClients = new Map<string, string>(); // socketId -> carrierId

//   constructor(
//     private readonly routesService: RoutesService,
//     private readonly routeTrackingService: RouteTrackingService,
//     private readonly jwtService: JwtService,
//   ) {}

//   async handleConnection(client: Socket) {
//     try {
//       this.logger.log(`Client attempting connection: ${client.id}`);

//       const token = client.handshake.query.token as string;
//       if (!token) {
//         throw new UnauthorizedException('No token provided');
//       }

//       const payload = await this.jwtService.verifyAsync(token, {
//         secret: process.env.JWT_SECRET
//       });

//       if (!payload.principal) {
//         throw new UnauthorizedException('Invalid token payload');
//       }

//       const carrierId = payload.principal;
//       this.connectedClients.set(client.id, carrierId);

//       // Get active route for this carrier
//       const activeRoute = await this.routesService.findActiveRouteByCarrier(carrierId);
//       if (activeRoute) {
//         client.join(`route-${activeRoute.id}`);
//         this.logger.log(`Client ${client.id} joined route-${activeRoute.id}`);
//       }

//       this.logger.log(`Client connected successfully: ${client.id}`);
//     } catch (error) {
//       this.logger.error(`Connection failed for client ${client.id}: ${error.message}`);
//       client.disconnect();
//     }
//   }

//   async handleDisconnect(client: Socket) {
//     this.logger.log(`Client disconnected: ${client.id}`);
//     this.connectedClients.delete(client.id);
//   }

//   @SubscribeMessage('updateLocation')
//   async handleLocationUpdate(
//     @MessageBody() data: LocationUpdate,
//     @ConnectedSocket() client: Socket
//   ): Promise<void> {
//     try {
//       const carrierId = this.connectedClients.get(client.id);
//       if (!carrierId) {
//         throw new UnauthorizedException('Client not authenticated');
//       }

//       // Get active route
//       const route = await this.routesService.findActiveRouteByCarrier(carrierId);
//       if (!route) return;

//       // Update location and get status changes
//       const { updatedShipments } = await this.routeTrackingService.updateCarrierLocation(
//         carrierId,
//         data,
//         route
//       );

//       // Broadcast updates
//       this.broadcastUpdates(route, updatedShipments, data);
//     } catch (error) {
//       this.logger.error(`Error handling location update: ${error.message}`);
//       client.emit('error', { message: 'Failed to update location' });
//     }
//   }

//   private broadcastUpdates(route: Route, updatedShipments: Shipment[], locationData: LocationUpdate): void {
//     // Broadcast route update
//     this.server.to(`route-${route.id}`).emit('route-update', {
//       routeId: route.id,
//       location: locationData,
//       metrics: route.metrics
//     });

//     // Broadcast individual shipment updates
//     for (const shipment of updatedShipments) {
//       this.server.emit('shipment-update', {
//         shipmentId: shipment.id,
//         status: shipment.status,
//         lastUpdate: locationData.timestamp,
//         eta: this.routeTrackingService.calculateETAFromRoute(shipment, route),
//         routeSegment: this.routeTrackingService.extractRouteSegment(shipment, route)
//       });
//     }
//   }
// }