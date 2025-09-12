// Main exports for the membership block
export { MembershipBlock, membershipBlock } from './membership-block.js';
export { membershipEvents } from './events/event-emitter.js';

// Export types
export type * from './types/index.js';

// Export services for advanced usage
export { PasswordServiceImpl } from './services/password.service.js';
export { JWTService } from './services/jwt.service.js';
export { InMemoryUserRepository, PostgreSQLUserRepository } from './repositories/user.repository.js';

// Export command handlers for advanced usage
export { RegisterUserCommandHandler } from './commands/register-user.command.js';
export { AuthenticateUserCommandHandler } from './commands/authenticate-user.command.js';
export { GetProfileCommandHandler } from './commands/get-profile.command.js';
export { UpdateProfileCommandHandler } from './commands/update-profile.command.js';
export { ValidateTokenCommandHandler } from './commands/validate-token.command.js';

// Export event emitter types
export type { MembershipEvent, EventHandler } from './events/event-emitter.js';