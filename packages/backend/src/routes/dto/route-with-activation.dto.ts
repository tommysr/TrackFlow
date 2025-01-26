import { ApiProperty } from "@nestjs/swagger";
import { Route } from "../entities/route.entity";

export class RouteWithActivationDto {
  @ApiProperty()
  route: Route;

  @ApiProperty()
  latestActivationTime: Date;
}
