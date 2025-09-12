import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface SchemaInfo {
  name: string;
  version: string;
  schema: z.ZodSchema;
  description?: string;
  examples?: any[];
}

export interface GeneratedSchema {
  name: string;
  version: string;
  jsonSchema: any;
  description?: string;
  examples?: any[];
  generatedAt: Date;
}

export class SchemaGenerator {
  private schemas: Map<string, SchemaInfo> = new Map();

  registerSchema(info: SchemaInfo): void {
    const key = `${info.name}@${info.version}`;
    this.schemas.set(key, info);
  }

  generateJsonSchema(name: string, version: string): GeneratedSchema | null {
    const key = `${name}@${version}`;
    const schemaInfo = this.schemas.get(key);
    
    if (!schemaInfo) {
      return null;
    }

    const jsonSchema = zodToJsonSchema(schemaInfo.schema, {
      name: schemaInfo.name,
      $refStrategy: 'none'
    });

    return {
      name: schemaInfo.name,
      version: schemaInfo.version,
      jsonSchema,
      description: schemaInfo.description,
      examples: schemaInfo.examples,
      generatedAt: new Date()
    };
  }

  generateAllSchemas(): GeneratedSchema[] {
    const results: GeneratedSchema[] = [];
    
    for (const schemaInfo of this.schemas.values()) {
      const generated = this.generateJsonSchema(schemaInfo.name, schemaInfo.version);
      if (generated) {
        results.push(generated);
      }
    }

    return results;
  }

  listSchemas(): Array<{ name: string; version: string; description?: string }> {
    return Array.from(this.schemas.values()).map(info => ({
      name: info.name,
      version: info.version,
      description: info.description
    }));
  }

  hasSchema(name: string, version: string): boolean {
    const key = `${name}@${version}`;
    return this.schemas.has(key);
  }

  removeSchema(name: string, version: string): boolean {
    const key = `${name}@${version}`;
    return this.schemas.delete(key);
  }

  clear(): void {
    this.schemas.clear();
  }
}

// Schema versioning utilities
export class SchemaVersioning {
  static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}. Expected semantic version (e.g., 1.0.0)`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3])
    };
  }

  static isBreakingChange(oldVersion: string, newVersion: string): boolean {
    const old = SchemaVersioning.parseVersion(oldVersion);
    const updated = SchemaVersioning.parseVersion(newVersion);

    // Major version bump indicates breaking change
    return updated.major > old.major;
  }

  static isCompatibleChange(oldVersion: string, newVersion: string): boolean {
    const old = SchemaVersioning.parseVersion(oldVersion);
    const updated = SchemaVersioning.parseVersion(newVersion);

    // Same major version means compatible changes
    return updated.major === old.major && (
      updated.minor > old.minor || 
      (updated.minor === old.minor && updated.patch > old.patch)
    );
  }

  static compareVersions(version1: string, version2: string): -1 | 0 | 1 {
    const v1 = SchemaVersioning.parseVersion(version1);
    const v2 = SchemaVersioning.parseVersion(version2);

    if (v1.major !== v2.major) return v1.major < v2.major ? -1 : 1;
    if (v1.minor !== v2.minor) return v1.minor < v2.minor ? -1 : 1;
    if (v1.patch !== v2.patch) return v1.patch < v2.patch ? -1 : 1;
    
    return 0;
  }
}

// Contract validation utilities
export class ContractValidator {
  static detectBreakingChanges(
    oldSchema: any, 
    newSchema: any
  ): Array<{ type: string; field: string; description: string }> {
    const changes: Array<{ type: string; field: string; description: string }> = [];

    // This is a simplified implementation
    // In production, you'd want more sophisticated schema diffing
    
    if (oldSchema.properties && newSchema.properties) {
      // Check for removed required fields
      const oldRequired = oldSchema.required || [];
      const newRequired = newSchema.required || [];
      
      for (const field of oldRequired) {
        if (!newRequired.includes(field)) {
          changes.push({
            type: 'removed_required_field',
            field,
            description: `Required field '${field}' was removed`
          });
        }
      }

      // Check for changed field types
      for (const [fieldName, oldFieldSchema] of Object.entries(oldSchema.properties)) {
        const newFieldSchema = newSchema.properties[fieldName];
        
        if (newFieldSchema && 
            (oldFieldSchema as any).type !== (newFieldSchema as any).type) {
          changes.push({
            type: 'changed_field_type',
            field: fieldName,
            description: `Field '${fieldName}' type changed from ${(oldFieldSchema as any).type} to ${(newFieldSchema as any).type}`
          });
        }
      }
    }

    return changes;
  }

  static isBackwardCompatible(oldSchema: any, newSchema: any): boolean {
    const breakingChanges = ContractValidator.detectBreakingChanges(oldSchema, newSchema);
    return breakingChanges.length === 0;
  }
}