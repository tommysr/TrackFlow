import { UserRole } from "../entities/icp.user.entity";

export interface JwtPayload {
  sub: string;
  principal: string;
  // role: UserRole;
}
