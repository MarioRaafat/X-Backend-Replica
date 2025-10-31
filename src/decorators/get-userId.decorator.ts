import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// we need to redefine the Request to include the user property and its structure
interface IAuthenticatedRequest extends Request {
    user: {
        id: string;
        // add here other properties if needed (e.g., email, roles, etc.) for future use
        // don't forget to modify the generateTokens method in auth.service.ts if you add more properties
    };
}

// This is a custom decorator to extract the user ID from the request object direct without needing to access the entire user object
// it assumes that the JwtAuthGuard has already validated the token and attached the user object to the request
export const GetUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | null => {
        const request = ctx.switchToHttp().getRequest<IAuthenticatedRequest>();
        const user = request.user;
        return user.id;
    }
);
