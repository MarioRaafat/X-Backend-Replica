import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Response');

    constructor() {}

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl: url } = req;
        const req_time = new Date().getTime();

        res.on('finish', () => {
            const { statusCode: status_code } = res;
            const res_time = new Date().getTime();
            const level = status_code >= 500 ? 'error' : status_code >= 400 ? 'warn' : 'log';

            const log_message = `${method} ${url} ${status_code} - ${res_time - req_time} ms`;
            switch (level) {
                case 'error':
                    this.logger.error(log_message);
                    break;
                case 'warn':
                    this.logger.warn(log_message);
                    break;
                default:
                    this.logger.log(log_message);
            }
        });
        next();
    }
}
