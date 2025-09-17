"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.loadEnv = loadEnv;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(900000), // 15 minutes
    RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(100),
    CORS_ORIGINS: zod_1.z.string().optional().transform(val => val ? val.split(',').map(origin => origin.trim()) : ['http://localhost:3000']),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
exports.EnvSchema = EnvSchema;
let cachedEnv = null;
function loadEnv() {
    if (cachedEnv) {
        return cachedEnv;
    }
    try {
        cachedEnv = EnvSchema.parse(process.env);
        return cachedEnv;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
            throw new Error(`Environment validation failed:\n${errorMessages}`);
        }
        throw error;
    }
}
function validateEnv(env) {
    return EnvSchema.parse(env);
}
//# sourceMappingURL=env.js.map