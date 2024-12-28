import { Request } from 'express';
import { IcpUser } from '../entities/icp.user.entity';

export interface AuthenticatedRequest extends Request {
  user: IcpUser;
} 