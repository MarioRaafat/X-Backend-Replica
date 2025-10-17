import { PartialType } from "@nestjs/swagger";
import { CreateTweetDTO } from "./create-tweet.dto";

export class UpdateTweetWithQuoteDTO extends PartialType(CreateTweetDTO) {}