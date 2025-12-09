import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/user/user.repository';
import { USERNAME_MAX_LENGTH } from 'src/constants/variables';

@Injectable()
export class UsernameService {
    constructor(private readonly user_repository: UserRepository) {}

    async generateUsernameRecommendationsSingleName(name: string): Promise<string[]> {
        const name_parts = name.split(' ');
        const first_name = name_parts[0];
        const last_name = name_parts.length > 1 ? name_parts.slice(1).join(' ') : '';

        const recommendations = await this.generateUsernameRecommendations(first_name, last_name);

        return recommendations;
    }

    async generateUsernameRecommendations(
        first_name: string,
        last_name: string
    ): Promise<string[]> {
        const base_username = this.cleanName(first_name + last_name);
        const first_name_only = this.cleanName(first_name);
        const last_name_only = this.cleanName(last_name ? last_name : ' ');

        const recommendations: string[] = [];

        // Pattern 1: firstname + lastname
        const pattern1 = this.truncateToMaxLength(base_username.toLowerCase());
        if (await this.isUsernameAvailable(pattern1)) {
            recommendations.push(pattern1);
        }

        // Pattern 2: firstname + lastname + random numbers
        for (let i = 0; i < 3; i++) {
            const random_num = Math.floor(Math.random() * 9999);
            const base = this.truncateForNumbers(base_username.toLowerCase(), random_num);
            const pattern2 = `${base}${random_num}`;
            if (await this.isUsernameAvailable(pattern2)) {
                recommendations.push(pattern2);
                if (recommendations.length >= 5) break;
            }
        }

        // Pattern 3: firstname + underscore + lastname
        if (recommendations.length < 5) {
            const pattern3 = this.truncateToMaxLength(
                `${first_name_only.toLowerCase()}_${last_name_only.toLowerCase()}`
            );
            if (await this.isUsernameAvailable(pattern3)) {
                recommendations.push(pattern3);
            }
        }

        // Pattern 4: firstname + random numbers
        if (recommendations.length < 5) {
            for (let i = 0; i < 3; i++) {
                const random_num = Math.floor(Math.random() * 9999);
                const base = this.truncateForNumbers(first_name_only.toLowerCase(), random_num);
                const pattern4 = `${base}${random_num}`;
                if (await this.isUsernameAvailable(pattern4)) {
                    recommendations.push(pattern4);
                    if (recommendations.length >= 5) break;
                }
            }
        }

        // Pattern 5: lastname + random numbers
        if (recommendations.length < 5 && last_name_only.trim()) {
            for (let i = 0; i < 3; i++) {
                const random_num = Math.floor(Math.random() * 9999);
                const base = this.truncateForNumbers(last_name_only.toLowerCase(), random_num);
                const pattern5 = `${base}${random_num}`;
                if (await this.isUsernameAvailable(pattern5)) {
                    recommendations.push(pattern5);
                    if (recommendations.length >= 5) break;
                }
            }
        }

        // Fill remaining slots with more random variations
        while (recommendations.length < 5) {
            const random_num = Math.floor(Math.random() * 9999);
            const base = this.truncateForNumbers(first_name_only.toLowerCase(), random_num);
            const random_pattern = `${base}${random_num}`;
            if (await this.isUsernameAvailable(random_pattern)) {
                recommendations.push(random_pattern);
            }
        }

        return recommendations.slice(0, 5);
    }

    async isUsernameAvailable(username: string): Promise<boolean> {
        try {
            const existing_user = await this.user_repository.findByUsername(username);
            return !existing_user;
        } catch (error) {
            // If user not found, username is available
            return true;
        }
    }

    private cleanName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
            .replace(/\s+/g, ''); // Remove spaces
    }

    private truncateToMaxLength(str: string): string {
        if (str.length <= USERNAME_MAX_LENGTH) {
            return str;
        }
        return str.substring(0, USERNAME_MAX_LENGTH - 1);
    }

    private truncateForNumbers(base: string, number: number): string {
        const number_length = number.toString().length;
        const max_base_length = USERNAME_MAX_LENGTH - number_length;

        if (base.length <= max_base_length) {
            return base;
        }
        return base.substring(0, max_base_length - 1);
    }
}
