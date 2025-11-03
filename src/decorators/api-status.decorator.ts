import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export enum ImplementationStatus {
    IMPLEMENTED = 'implemented',
    IN_PROGRESS = 'in-progress',
    NOT_IMPLEMENTED = 'not-implemented',
}

interface IImplementationStatusOptions {
    status: ImplementationStatus;
    summary: string;
    notes?: string;
    expectedDate?: string;
}

/**
 * Decorator to indicate implementation status of an endpoint in Swagger documentation
 * Adds a small status indicator at the end of the summary
 * @param options - Configuration object with status and summary
 */
export const ApiImplementationStatus = (options: IImplementationStatusOptions) => {
    const status_config = {
        [ImplementationStatus.IMPLEMENTED]: {
            icon: '✅',
            label: 'Ready',
        },
        [ImplementationStatus.IN_PROGRESS]: {
            icon: '🚧',
            label: 'In Progress',
        },
        [ImplementationStatus.NOT_IMPLEMENTED]: {
            icon: '❌',
            label: 'Not Implemented',
        },
    };

    const config = status_config[options.status];

    // Add status icon at the end of summary
    const summary = `${options.summary} ${config.icon}`;

    // Build detailed description
    let description = `**Status:** ${config.label}`;

    if (options.notes) {
        description += `\n\n${options.notes}`;
    }

    if (options.expectedDate) {
        description += `\n\n**Expected:** ${options.expectedDate}`;
    }

    const decorators = [
        ApiOperation({
            summary,
            description,
        }),
    ];

    return applyDecorators(...decorators);
};
