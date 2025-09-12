import pino from 'pino';
import { loadEnv } from '@config/env';

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie', 
      'req.headers["set-cookie"]',
      'res.headers["set-cookie"]'
    ],
    remove: true
  },
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});