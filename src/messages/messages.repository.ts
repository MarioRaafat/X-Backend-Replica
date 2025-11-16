import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, DeleteResult, Repository } from 'typeorm';
import { InsertResult } from 'typeorm/browser';
import { SendMessageDto, UpdateMessageDto } from './dto';
import { Message } from './entities/message.entity';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { PaginationService } from '../shared/services/pagination/pagination.service';

@Injectable()
export class MessageRepository extends Repository<Message> {
    constructor(
        private dataSource: DataSource,
        private paginationService: PaginationService
    ) {
        super(Message, dataSource.createEntityManager());
    }
}
