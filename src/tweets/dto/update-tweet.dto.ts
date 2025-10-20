import { PartialType } from '@nestjs/mapped-types';
import { CreateTweetDTO } from './create-tweet.dto';

export class UpdateTweetDTO extends PartialType(CreateTweetDTO) {}
