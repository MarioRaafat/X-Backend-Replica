import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { FCMService } from './expo.service';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { register_device_token_swagger, remove_device_token_swagger } from './expo.swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Expo - Push Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('fcm')
export class FcmController {
    constructor(private readonly fcm_service: FCMService) {}

    @HttpCode(HttpStatus.OK)
    @ApiOperation(register_device_token_swagger.operation)
    @ApiBody(register_device_token_swagger.body)
    @ApiOkResponse(register_device_token_swagger.responses.success)
    @ApiBadRequestResponse(register_device_token_swagger.responses.badRequest)
    @ApiUnauthorizedResponse(register_device_token_swagger.responses.unauthorized)
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('token')
    async registerDeviceToken(@Req() req: any, @Body('token') token: string) {
        const user_id = req.user.id;
        await this.fcm_service.addUserDeviceToken(user_id, token);
        return { success: true };
    }

    @HttpCode(HttpStatus.OK)
    @ApiOperation(remove_device_token_swagger.operation)
    @ApiOkResponse(remove_device_token_swagger.responses.success)
    @ApiUnauthorizedResponse(remove_device_token_swagger.responses.unauthorized)
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Delete('token')
    async removeDeviceToken(@Req() req: any) {
        const user_id = req.user.id;
        await this.fcm_service.removeUserDeviceToken(user_id);
        return { success: true };
    }
}
