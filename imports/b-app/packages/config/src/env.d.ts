import { z } from 'zod';
declare const EnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    JWT_SECRET: z.ZodString;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodNumber>;
    CORS_ORIGINS: z.ZodEffects<z.ZodOptional<z.ZodString>, string[], string | undefined>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    JWT_SECRET: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    CORS_ORIGINS: string[];
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
}, {
    JWT_SECRET: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    RATE_LIMIT_WINDOW_MS?: number | undefined;
    RATE_LIMIT_MAX?: number | undefined;
    CORS_ORIGINS?: string | undefined;
    LOG_LEVEL?: "error" | "warn" | "info" | "debug" | undefined;
}>;
type Env = z.infer<typeof EnvSchema>;
export declare function loadEnv(): Env;
export declare function validateEnv(env: Record<string, unknown>): Env;
export { EnvSchema };
export type { Env };
//# sourceMappingURL=env.d.ts.map