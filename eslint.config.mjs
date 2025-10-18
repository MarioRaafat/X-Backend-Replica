// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs', 'dist', 'node_modules', 'coverage', 'build'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'module',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            // TypeScript specific rules
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/require-await': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-unsafe-function-type': 'warn',

            // Naming conventions for your NestJS style guide
            '@typescript-eslint/naming-convention': [
                'error',
                // Classes, Modules, Types - PascalCase
                {
                    selector: 'class',
                    format: ['PascalCase'],
                },
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: true, // MUST have I prefix
                    },
                },
                {
                    selector: 'typeAlias',
                    format: ['PascalCase'],
                },
                {
                    selector: 'enum',
                    format: ['PascalCase'],
                },
                // Enum members - UPPERCASE
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE'],
                },
                // Functions and Methods - camelCase
                {
                    selector: 'function',
                    format: ['camelCase'],
                },
                {
                    selector: 'method',
                    format: ['camelCase'],
                },
                // Variables - snake_case (except constants)
                {
                    selector: 'variable',
                    format: ['snake_case', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                },
                // Constants - UPPERCASE
                {
                    selector: 'variable',
                    modifiers: ['const'],
                    format: ['UPPER_CASE', 'snake_case'],
                },
                // Parameters - snake_case
                {
                    selector: 'parameter',
                    format: ['snake_case'],
                    leadingUnderscore: 'allow',
                },
                // Type parameters<T> - PascalCase
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                },
            ],

            // Code style - K&R brace style handled by Prettier
            'brace-style': 'off',
            '@typescript-eslint/brace-style': 'off',

            // General code quality
            'no-console': 'warn',
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            'max-len': [
                'warn',
                {
                    code: 100,
                    ignoreComments: true,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                    ignoreUrls: true,
                },
            ],

            // TypeScript code quality
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/no-empty-function': 'warn',

            // Import organization
            'sort-imports': [
                'error',
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                },
            ],
        },
    }
);
