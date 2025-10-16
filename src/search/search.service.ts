import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  async getSuggestions(query: string) {}

  async searchUsers(query: string) {}

  async searchPosts(query: string) {}

  async searchLatestPosts(query: string) {}
}
