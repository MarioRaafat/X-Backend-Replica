import { Injectable } from '@nestjs/common';
import { CreateSearchHistoryQueryDto } from './dto/create-search-history-query.dto';
import { CreateSearchHistoryPeopleDto } from './dto/create-search-history-people.dto';

@Injectable()
export class SearchService {
  async getSuggestions(query: string) {}

  async getSearchHistory() {}

  async deleteAllSearchHistory() {}

  async deleteSearchHistoryById(id: string) {}

  async createSearchHistoryQuery(body: CreateSearchHistoryQueryDto) {}

  async createSearchHistoryPeople(body: CreateSearchHistoryPeopleDto) {}
}
