import { Injectable } from '@nestjs/common';

@Injectable()
export class ExploreService {
  async root() {
    return { message: 'Explore endpoint' };
  }

  async getTrending(category?: string, country?: string) {}

  async getWhoToFollow() {}

  async getForYouPosts(category?: string) {}
}
