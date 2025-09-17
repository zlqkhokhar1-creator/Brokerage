#!/usr/bin/env node

/**
 * Block Scaffolding Script
 * Creates a new block directory with template files
 */

const fs = require('fs');
const path = require('path');

function createBlock(blockName) {
  if (!blockName) {
    console.error('❌ Block name is required');
    console.log('Usage: npm run scaffold:block <block-name>');
    process.exit(1);
  }

  // Validate block name (kebab-case)
  if (!/^[a-z][a-z0-9-]*$/.test(blockName)) {
    console.error('❌ Block name must be in kebab-case (e.g., my-new-block)');
    process.exit(1);
  }

  const blockDir = path.join(__dirname, '..', 'packages', 'blocks', blockName);
  
  // Check if block already exists
  if (fs.existsSync(blockDir)) {
    console.error(`❌ Block '${blockName}' already exists at ${blockDir}`);
    process.exit(1);
  }

  console.log(`🔨 Creating new block: ${blockName}`);

  // Create block directory structure
  fs.mkdirSync(blockDir, { recursive: true });
  fs.mkdirSync(path.join(blockDir, 'src'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: `@b-app/block-${blockName}`,
    version: '0.1.0',
    description: `${blockName} block for B-App platform`,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      'dev': 'tsc --watch'
    },
    dependencies: {
      '@b-app/platform-core': '0.1.0',
      '@b-app/platform-block-api': '0.1.0',
      '@b-app/platform-serialization': '0.1.0',
      'zod': '^3.22.0'
    },
    devDependencies: {
      'typescript': '^5.0.0'
    }
  };

  fs.writeFileSync(
    path.join(blockDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'CommonJS',
      lib: ['ES2022'],
      outDir: './dist',
      rootDir: './',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      moduleResolution: 'node',
      allowSyntheticDefaultImports: true
    },
    include: ['src/**/*', '*.ts'],
    exclude: ['node_modules', 'dist']
  };

  fs.writeFileSync(
    path.join(blockDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // Create schemas.ts
  const schemas = `import { z } from 'zod';

// Command schemas
export const ExampleCommandInputSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().min(1),
  options: z.object({
    priority: z.enum(['low', 'medium', 'high']).default('medium')
  }).optional()
});

export const ExampleCommandOutputSchema = z.object({
  id: z.string(),
  result: z.string(),
  processedAt: z.string().datetime(),
  status: z.enum(['success', 'error'])
});

// Event schemas
export const ExampleEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  message: z.string(),
  processedAt: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

// Types
export type ExampleCommandInput = z.infer<typeof ExampleCommandInputSchema>;
export type ExampleCommandOutput = z.infer<typeof ExampleCommandOutputSchema>;
export type ExampleEvent = z.infer<typeof ExampleEventSchema>;
`;

  fs.writeFileSync(path.join(blockDir, 'src', 'schemas.ts'), schemas);

  // Create block.config.ts
  const blockConfig = `import { defineBlock, defineCommand, BlockContext } from '@b-app/platform-block-api';
import { 
  ExampleCommandInputSchema, 
  ExampleCommandOutputSchema,
  ExampleCommandInput,
  ExampleCommandOutput,
  ExampleEvent
} from './src/schemas';

export default defineBlock({
  metadata: {
    name: '${blockName}',
    version: '0.1.0',
    kind: 'handler',
    description: '${blockName} block for B-App platform',
    author: 'B-App Platform',
    policies: {
      authLevel: 'user',
      permissions: ['${blockName}:execute'],
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      }
    }
  },

  async register(context: BlockContext) {
    context.logger.info('${blockName} block registered successfully');
  },

  commands: {
    ExampleCommand: defineCommand<ExampleCommandInput, ExampleCommandOutput>({
      handler: async (input: ExampleCommandInput, context: BlockContext): Promise<ExampleCommandOutput> => {
        const { logger, eventBus } = context;
        
        logger.info('Processing example command', {
          message: input.message,
          userId: input.userId
        });

        // Process the command
        const id = \`\${blockName}_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        const now = new Date().toISOString();

        try {
          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 50));

          // Create result
          const result: ExampleCommandOutput = {
            id,
            result: \`Processed: \${input.message}\`,
            processedAt: now,
            status: 'success'
          };

          // Publish event
          const event: ExampleEvent = {
            id,
            userId: input.userId,
            message: input.message,
            processedAt: now,
            metadata: input.options
          };

          if (eventBus) {
            await eventBus.publish('${blockName}.example.processed.v1', event, {
              source: '${blockName}',
              userId: input.userId
            });
          }

          logger.info('Example command processed successfully', {
            id: result.id,
            userId: input.userId
          });

          return result;
        } catch (error) {
          logger.error('Example command processing failed', {
            error: error instanceof Error ? error.message : String(error),
            userId: input.userId
          });

          return {
            id,
            result: 'Error processing command',
            processedAt: now,
            status: 'error'
          };
        }
      },
      inputSchema: ExampleCommandInputSchema,
      outputSchema: ExampleCommandOutputSchema,
      policies: {
        authLevel: 'user',
        permissions: ['${blockName}:example'],
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000
        }
      }
    })
  }
});
`;

  fs.writeFileSync(path.join(blockDir, 'block.config.ts'), blockConfig);

  // Create README.md
  const readme = `# ${blockName} Block

A block for the B-App platform.

## Description

This block provides [describe functionality here].

## Commands

### ExampleCommand

Processes a message and returns a result.

#### Input
- \`message\` (string, required): The message to process
- \`userId\` (string, required): The user ID
- \`options\` (object, optional): Additional options
  - \`priority\` (enum: 'low' | 'medium' | 'high'): Processing priority

#### Output
- \`id\` (string): Unique identifier for the processed command
- \`result\` (string): The processing result
- \`processedAt\` (string): ISO datetime when processed
- \`status\` (enum: 'success' | 'error'): Processing status

## Events

### ${blockName}.example.processed.v1

Published when an example command is successfully processed.

## Development

### Building

\`\`\`bash
npm run build
\`\`\`

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

## Usage

\`\`\`bash
curl -X POST http://localhost:5001/api/v1/blocks/commands/ExampleCommand \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, world!",
    "userId": "user123",
    "options": {
      "priority": "high"
    }
  }'
\`\`\`
`;

  fs.writeFileSync(path.join(blockDir, 'README.md'), readme);

  console.log(`✅ Block '${blockName}' created successfully!`);
  console.log(`📁 Location: ${blockDir}`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. cd packages/blocks/${blockName}`);
  console.log('2. npm install');
  console.log('3. npm run build');
  console.log('4. Update the block implementation in block.config.ts');
  console.log('5. Update schemas in src/schemas.ts');
  console.log('6. Update README.md with your block details');
}

// Get block name from command line arguments
const blockName = process.argv[2];

if (require.main === module) {
  createBlock(blockName);
}

module.exports = { createBlock };