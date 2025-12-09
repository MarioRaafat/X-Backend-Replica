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
import { FCMService } from './fcm.service';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { register_device_token_swagger, remove_device_token_swagger } from './fcm.swagger';

@ApiTags('FCM - Push Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fcm')
export class FcmController {
    constructor(private readonly fcm_service: FCMService) {}

    @Post('token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation(register_device_token_swagger.operation)
    @ApiBody(register_device_token_swagger.body)
    @ApiOkResponse(register_device_token_swagger.responses.success)
    @ApiBadRequestResponse(register_device_token_swagger.responses.badRequest)
    @ApiUnauthorizedResponse(register_device_token_swagger.responses.unauthorized)
    async registerDeviceToken(@Req() req: any, @Body('token') token: string) {
        const user_id = req.user.id;
        await this.fcm_service.addUserDeviceToken(user_id, token);
        return { success: true };
    }

    @Delete('token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation(remove_device_token_swagger.operation)
    @ApiOkResponse(remove_device_token_swagger.responses.success)
    @ApiUnauthorizedResponse(remove_device_token_swagger.responses.unauthorized)
    async removeDeviceToken(@Req() req: any) {
        const user_id = req.user.id;
        await this.fcm_service.removeUserDeviceToken(user_id);
        return { success: true };
    }
}
