import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { Category } from './entities';
import { get_categories_swagger } from './category.swagger';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/swagger-messages';
import { ApiInternalServerError } from '../decorators/swagger-error-responses.decorator';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @ApiOperation(get_categories_swagger.operation)
    @ApiOkResponse(get_categories_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB)
    @ResponseMessage(SUCCESS_MESSAGES.CATEGORIES_RETRIEVED)
    @Get()
    async getCategories(): Promise<string[]> {
        return await this.categoryService.getCategories();
    }
}
