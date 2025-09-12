"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockConfig = void 0;
/**
 * Block configuration for legacy-adapter
 * Provides metadata and configuration for the legacy adapter block
 */
exports.blockConfig = {
    name: 'legacy-adapter',
    kind: 'adapter',
    version: '0.1.0',
    description: 'Adapter block for integrating with legacy backend services via HTTP',
    // Commands provided by this block
    commands: [
        {
            name: 'CreateUser',
            description: 'Create a new user via legacy backend registration endpoint',
            version: '1.0.0',
            handler: 'CreateUserHandler',
        },
    ],
    // Events published by this block
    events: [
        {
            name: 'user.registered.v1',
            description: 'Published when a user is successfully registered via legacy system',
            version: '1.0.0',
            schema: 'UserRegisteredEventV1Schema',
        },
    ],
    // Configuration options
    config: {
        legacyBaseUrl: {
            description: 'Base URL of the legacy backend service',
            type: 'string',
            required: true,
            default: process.env.LEGACY_BASE_URL || 'http://localhost:5001',
        },
        timeout: {
            description: 'HTTP request timeout in milliseconds',
            type: 'number',
            required: false,
            default: 10000,
        },
    },
    // Dependencies
    dependencies: [
        '@brokerage/platform-http',
    ],
    // Metadata for observability
    metadata: {
        category: 'integration',
        tags: ['legacy', 'adapter', 'http'],
        maintainer: 'platform-team',
    },
};
exports.default = exports.blockConfig;
//# sourceMappingURL=block.config.js.map