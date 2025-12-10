import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_categories_swagger = {
    operation: {
        summary: 'Get all categories',
        description: `
**Get All Categories**

Retrieve a list of all available categories in the system.

**What happens:**
- Fetches all categories from the database
- Returns category id and name for each category

**Use case:** Display available categories for tweet categorization or filtering
        `,
    },

    responses: {
        success: {
            description: 'Categories retrieved successfully',
            schema: {
                example: {
                    data: ['Technology', 'Sports', 'Entertainment', 'News', 'Gaming'],
                    count: 5,
                    message: SUCCESS_MESSAGES.CATEGORIES_RETRIEVED,
                },
            },
        },
    },
};
