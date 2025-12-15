import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly redis_service: RedisService) {
        super();
    }

    override async canActivate(context: ExecutionContext) {
        const can_activate = await super.canActivate(context);

        if (!can_activate) {
            return false;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        let is_deleted = false;
        if (user) {
            try {
                is_deleted = await this.redis_service.exists(`deleted_user:${user.id}`);
            } catch (error) {
                console.warn('Failed to check deleted user in Redis:', error.message);
            }
            if (is_deleted) {
                throw new UnauthorizedException('User account has been deleted');
            }
        }

        return true;
    }

    override handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException('Invalid token');
        }
        return user;
    }
}
