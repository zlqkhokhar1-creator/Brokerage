/**
 * Block configuration for legacy-adapter
 * Provides metadata and configuration for the legacy adapter block
 */
export declare const blockConfig: {
    readonly name: "legacy-adapter";
    readonly kind: "adapter";
    readonly version: "0.1.0";
    readonly description: "Adapter block for integrating with legacy backend services via HTTP";
    readonly commands: readonly [{
        readonly name: "CreateUser";
        readonly description: "Create a new user via legacy backend registration endpoint";
        readonly version: "1.0.0";
        readonly handler: "CreateUserHandler";
    }];
    readonly events: readonly [{
        readonly name: "user.registered.v1";
        readonly description: "Published when a user is successfully registered via legacy system";
        readonly version: "1.0.0";
        readonly schema: "UserRegisteredEventV1Schema";
    }];
    readonly config: {
        readonly legacyBaseUrl: {
            readonly description: "Base URL of the legacy backend service";
            readonly type: "string";
            readonly required: true;
            readonly default: string;
        };
        readonly timeout: {
            readonly description: "HTTP request timeout in milliseconds";
            readonly type: "number";
            readonly required: false;
            readonly default: 10000;
        };
    };
    readonly dependencies: readonly ["@brokerage/platform-http"];
    readonly metadata: {
        readonly category: "integration";
        readonly tags: readonly ["legacy", "adapter", "http"];
        readonly maintainer: "platform-team";
    };
};
export default blockConfig;
//# sourceMappingURL=block.config.d.ts.map