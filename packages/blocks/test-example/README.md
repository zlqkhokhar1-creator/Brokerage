# test-example Block

A block for the B-App platform.

## Description

This block provides [describe functionality here].

## Commands

### ExampleCommand

Processes a message and returns a result.

#### Input
- `message` (string, required): The message to process
- `userId` (string, required): The user ID
- `options` (object, optional): Additional options
  - `priority` (enum: 'low' | 'medium' | 'high'): Processing priority

#### Output
- `id` (string): Unique identifier for the processed command
- `result` (string): The processing result
- `processedAt` (string): ISO datetime when processed
- `status` (enum: 'success' | 'error'): Processing status

## Events

### test-example.example.processed.v1

Published when an example command is successfully processed.

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Usage

```bash
curl -X POST http://localhost:5001/api/v1/blocks/commands/ExampleCommand \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, world!",
    "userId": "user123",
    "options": {
      "priority": "high"
    }
  }'
```
