import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export const ApiStatus = (status: 'implemented' | 'in-progress' | 'not-implemented') => {
    let icon = '';
    let label = '';

    switch (status) {
        case 'implemented':
            icon = '✅';
            label = 'Implemented';
            break;
        case 'in-progress':
            icon = '🚧';
            label = 'In progress';
            break;
        case 'not-implemented':
            icon = '❌';
            label = 'Not implemented';
            break;
    }

    // This will prefix the summary with your chosen icon/status
    return applyDecorators(
        ApiOperation({
            summary: `${icon} ${label}`,
        })
    );
};
