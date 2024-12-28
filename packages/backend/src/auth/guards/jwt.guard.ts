import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.log('JWT Guard - canActivate called');
    const request = context.switchToHttp().getRequest();
    this.logger.log('Headers:', request.headers);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log('JWT Guard - handleRequest called');
    this.logger.log('Error:', err);
    this.logger.log('User:', user);
    this.logger.log('Info:', info);

    if (err || !user) {
      this.logger.error('JWT Guard - Authentication failed', { err, info });
    }
    return super.handleRequest(err, user, info, context);
  }
}
