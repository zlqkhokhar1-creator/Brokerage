export function runMigrations(): Promise<void>;
export function getMigrationFiles(): string[];
export function getAppliedMigrations(): Promise<any[]>;
