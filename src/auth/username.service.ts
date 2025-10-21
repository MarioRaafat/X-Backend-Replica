import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class UsernameService {
    constructor(private readonly user_service: UserService) {}

    async generateUsernameRecommendations(
        first_name: string,
        last_name: string
    ): Promise<string[]> {
        const baseUsername = this.cleanName(first_name + last_name);
        const firstNameOnly = this.cleanName(first_name);
        const lastNameOnly = this.cleanName(last_name ? last_name : ' ');

        const recommendations: string[] = [];

        // Pattern 1: firstname + lastname
        const pattern1 = baseUsername.toLowerCase();
        if (await this.isUsernameAvailable(pattern1)) {
            recommendations.push(pattern1);
        }

        // Pattern 2: firstname + lastname + random numbers
        for (let i = 0; i < 3; i++) {
            const randomNum = Math.floor(Math.random() * 9999);
            const pattern2 = `${pattern1}${randomNum}`;
            if (await this.isUsernameAvailable(pattern2)) {
                recommendations.push(pattern2);
                if (recommendations.length >= 5) break;
            }
        }

        // Pattern 3: firstname + underscore + lastname
        if (recommendations.length < 5) {
            const pattern3 = `${firstNameOnly.toLowerCase()}_${lastNameOnly.toLowerCase()}`;
            if (await this.isUsernameAvailable(pattern3)) {
                recommendations.push(pattern3);
            }
        }

        // Pattern 4: firstname + random numbers
        if (recommendations.length < 5) {
            for (let i = 0; i < 3; i++) {
                const randomNum = Math.floor(Math.random() * 9999);
                const pattern4 = `${firstNameOnly.toLowerCase()}${randomNum}`;
                if (await this.isUsernameAvailable(pattern4)) {
                    recommendations.push(pattern4);
                    if (recommendations.length >= 5) break;
                }
            }
        }

        // Pattern 5: lastname + random numbers
        if (recommendations.length < 5) {
            for (let i = 0; i < 3; i++) {
                const randomNum = Math.floor(Math.random() * 9999);
                const pattern5 = `${lastNameOnly.toLowerCase()}${randomNum}`;
                if (await this.isUsernameAvailable(pattern5)) {
                    recommendations.push(pattern5);
                    if (recommendations.length >= 5) break;
                }
            }
        }

        // Fill remaining slots with more random variations
        while (recommendations.length < 5) {
            const randomNum = Math.floor(Math.random() * 99999);
            const randomPattern = `${firstNameOnly.toLowerCase()}${randomNum}`;
            if (await this.isUsernameAvailable(randomPattern)) {
                recommendations.push(randomPattern);
            }
        }

        return recommendations.slice(0, 5);
    }

    async isUsernameAvailable(username: string): Promise<boolean> {
        try {
            const existingUser = await this.user_service.findUserByUsername(username);
            return !existingUser;
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
}
