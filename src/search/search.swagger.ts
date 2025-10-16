import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_suggestions_swagger = {
  operation: {
    summary: 'Get suggestions of a query',
    description: `
    Get relevant suggestions of queries and people for a give query        
    `,
  },

  responses: {
    success: {
      description: 'Email verified successfully',
      schema: {
        example: {
          data: {
            userId: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
          },
          count: 1,
          message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
        },
      },
    },
  },
};
