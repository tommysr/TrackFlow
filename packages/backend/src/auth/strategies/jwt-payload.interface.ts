import { UserRole } from "../entities/user.entity";

export interface JwtPayload {
  sub: string;
  principal: string;
  role: UserRole;
}
