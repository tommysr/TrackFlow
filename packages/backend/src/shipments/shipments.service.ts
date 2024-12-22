import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { Repository } from 'typeorm';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
  ) {}

  async findOneById(id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
      relations: ['shipper', 'carrierPrincipal'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findByShipper(principal: string): Promise<Shipment[]> {
    return this.shipmentRepository.find({
      where: { shipper: { principal } },
      relations: ['locations', 'events'],
    });
  }

  async findByCarrier(principal: string): Promise<Shipment[]> {
    return this.shipmentRepository.find({
      where: { carrierPrincipal: { principal } },
      relations: ['locations', 'events'],
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto): Promise<Shipment> {
    const shipment = await this.findOneById(id);
    shipment.status = updateStatusDto.status;
    return this.shipmentRepository.save(shipment);
  }
} 