import * as path from 'path';
import * as fs from 'fs';
import glob from 'fast-glob';
import { BlockDefinition, LoadedBlock } from './types';

export interface BlockScannerOptions {
  blocksPaths?: string[];
  configFilePattern?: string;
}

export class BlockScanner {
  private options: Required<BlockScannerOptions>;

  constructor(options: BlockScannerOptions = {}) {
    this.options = {
      blocksPaths: options.blocksPaths || ['packages/blocks'],
      configFilePattern: options.configFilePattern || '**/block.config.{ts,js}'
    };
  }

  async scanBlocks(rootDir: string): Promise<LoadedBlock[]> {
    const blocks: LoadedBlock[] = [];
    
    for (const blocksPath of this.options.blocksPaths) {
      const fullPath = path.resolve(rootDir, blocksPath);
      
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const configFiles = await glob(this.options.configFilePattern, {
        cwd: fullPath,
        absolute: true
      });

      for (const configFile of configFiles) {
        try {
          const block = await this.loadBlock(configFile);
          blocks.push(block);
        } catch (error) {
          blocks.push({
            definition: {} as BlockDefinition,
            metadata: { name: 'unknown', version: '0.0.0', kind: 'service' },
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return blocks;
  }

  private async loadBlock(configPath: string): Promise<LoadedBlock> {
    try {
      // Clear require cache to ensure fresh load during development
      delete require.cache[require.resolve(configPath)];
      
      const blockModule = require(configPath);
      const blockDefinition: BlockDefinition = blockModule.default || blockModule;

      // Validate block definition
      this.validateBlockDefinition(blockDefinition);

      return {
        definition: blockDefinition,
        metadata: blockDefinition.metadata,
        status: 'loaded'
      };
    } catch (error) {
      throw new Error(`Failed to load block from ${configPath}: ${error}`);
    }
  }

  private validateBlockDefinition(definition: BlockDefinition): void {
    if (!definition.metadata) {
      throw new Error('Block must have metadata');
    }

    if (!definition.metadata.name) {
      throw new Error('Block metadata must have a name');
    }

    if (!definition.metadata.version) {
      throw new Error('Block metadata must have a version');
    }

    if (!definition.metadata.kind) {
      throw new Error('Block metadata must have a kind');
    }

    if (!['service', 'handler', 'middleware'].includes(definition.metadata.kind)) {
      throw new Error('Block kind must be one of: service, handler, middleware');
    }

    if (!definition.register || typeof definition.register !== 'function') {
      throw new Error('Block must have a register function');
    }

    // Validate version format (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    if (!versionRegex.test(definition.metadata.version)) {
      throw new Error('Block version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Validate commands if present
    if (definition.commands) {
      for (const [commandName, command] of Object.entries(definition.commands)) {
        if (!command.handler || typeof command.handler !== 'function') {
          throw new Error(`Command '${commandName}' must have a handler function`);
        }
      }
    }

    // Validate HTTP routes if present
    if (definition.httpRoutes) {
      for (const route of definition.httpRoutes) {
        if (!route.method || !route.path || !route.handler) {
          throw new Error('HTTP routes must have method, path, and handler');
        }
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method)) {
          throw new Error('HTTP route method must be one of: GET, POST, PUT, DELETE, PATCH');
        }
      }
    }
  }
}