#!/usr/bin/env node

/**
 * Schema Generation Script
 * Scans blocks and generates JSON schemas for contracts
 */

const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');

async function generateSchemas() {
  console.log('🔍 Scanning for block configurations...');
  
  const contractsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
  
  // Ensure contracts directory exists
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Find all block config files
  const blockConfigs = await glob('packages/blocks/**/block.config.js', {
    cwd: path.join(__dirname, '..'),
    absolute: true
  });

  console.log(`📦 Found ${blockConfigs.length} block configurations`);

  const schemas = [];

  for (const configPath of blockConfigs) {
    try {
      console.log(`Processing: ${path.relative(path.join(__dirname, '..'), configPath)}`);
      
      // For now, create placeholder schemas since we'd need the full TypeScript compilation
      // In a real implementation, this would load the compiled block configs and extract schemas
      
      let blockName = path.basename(path.dirname(configPath));
      
      // If we're in a dist directory, get the parent directory name
      if (blockName === 'dist') {
        blockName = path.basename(path.dirname(path.dirname(configPath)));
      }
      
      console.log(`Block name detected: ${blockName}`);
      
      // Generate placeholder schema for payment-stripe
      if (blockName === 'payment-stripe') {
        const paymentSchemas = {
          name: 'payment-stripe-contracts',
          version: '0.1.0',
          generatedAt: new Date().toISOString(),
          commands: {
            'AuthorizePayment': {
              input: {
                type: 'object',
                properties: {
                  amount: { type: 'integer', minimum: 1 },
                  currency: { type: 'string', minLength: 3, maxLength: 3 },
                  paymentMethodId: { type: 'string', minLength: 1 },
                  userId: { type: 'string', minLength: 1 },
                  description: { type: 'string' },
                  metadata: { type: 'object' }
                },
                required: ['amount', 'currency', 'paymentMethodId', 'userId']
              },
              output: {
                type: 'object',
                properties: {
                  paymentId: { type: 'string' },
                  status: { type: 'string', enum: ['authorized', 'failed', 'pending'] },
                  amount: { type: 'integer' },
                  currency: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  stripePaymentIntentId: { type: 'string' },
                  error: { type: 'string' }
                },
                required: ['paymentId', 'status', 'amount', 'currency', 'createdAt']
              }
            }
          },
          events: {
            'payment.authorized.v1': {
              type: 'object',
              properties: {
                paymentId: { type: 'string' },
                userId: { type: 'string' },
                amount: { type: 'integer' },
                currency: { type: 'string' },
                paymentMethodId: { type: 'string' },
                stripePaymentIntentId: { type: 'string' },
                authorizedAt: { type: 'string', format: 'date-time' },
                metadata: { type: 'object' }
              },
              required: ['paymentId', 'userId', 'amount', 'currency', 'paymentMethodId', 'authorizedAt']
            }
          }
        };
        schemas.push(paymentSchemas);
      }

      // Generate placeholder schema for ai-inference-openai  
      if (blockName === 'ai-inference-openai') {
        const aiSchemas = {
          name: 'ai-inference-openai-contracts',
          version: '0.1.0',
          generatedAt: new Date().toISOString(),
          commands: {
            'GenerateCompletion': {
              input: {
                type: 'object',
                properties: {
                  prompt: { type: 'string', minLength: 1, maxLength: 10000 },
                  model: { type: 'string' },
                  maxTokens: { type: 'integer', minimum: 1, maximum: 4096 },
                  temperature: { type: 'number', minimum: 0, maximum: 2 },
                  userId: { type: 'string', minLength: 1 },
                  systemMessage: { type: 'string' },
                  context: { type: 'object' }
                },
                required: ['prompt', 'model', 'maxTokens', 'temperature', 'userId']
              },
              output: {
                type: 'object',
                properties: {
                  completionId: { type: 'string' },
                  content: { type: 'string' },
                  model: { type: 'string' },
                  usage: {
                    type: 'object',
                    properties: {
                      promptTokens: { type: 'integer' },
                      completionTokens: { type: 'integer' },
                      totalTokens: { type: 'integer' }
                    },
                    required: ['promptTokens', 'completionTokens', 'totalTokens']
                  },
                  finishReason: { type: 'string', enum: ['stop', 'length', 'content_filter', 'error'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  error: { type: 'string' }
                },
                required: ['completionId', 'content', 'model', 'usage', 'finishReason', 'createdAt']
              }
            }
          },
          events: {
            'ai.completion.generated.v1': {
              type: 'object',
              properties: {
                completionId: { type: 'string' },
                userId: { type: 'string' },
                model: { type: 'string' },
                promptLength: { type: 'integer' },
                completionLength: { type: 'integer' },
                usage: {
                  type: 'object',
                  properties: {
                    promptTokens: { type: 'integer' },
                    completionTokens: { type: 'integer' },
                    totalTokens: { type: 'integer' }
                  }
                },
                finishReason: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                context: { type: 'object' }
              },
              required: ['completionId', 'userId', 'model', 'promptLength', 'completionLength', 'usage', 'finishReason', 'generatedAt']
            }
          }
        };
        schemas.push(aiSchemas);
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${configPath}: ${error.message}`);
    }
  }

  // Write schemas to files
  for (const schema of schemas) {
    const schemaFile = path.join(contractsDir, `${schema.name}.json`);
    fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
    console.log(`✅ Generated schema: ${schemaFile}`);
  }

  // Create index file
  const indexFile = path.join(contractsDir, 'index.json');
  const index = {
    generatedAt: new Date().toISOString(),
    schemas: schemas.map(s => ({
      name: s.name,
      version: s.version,
      file: `${s.name}.json`
    }))
  };
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

  console.log(`🎉 Schema generation completed! Generated ${schemas.length} contract schemas.`);
}

if (require.main === module) {
  generateSchemas().catch(console.error);
}

module.exports = { generateSchemas };