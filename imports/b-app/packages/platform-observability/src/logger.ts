import pino from 'pino';

export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service?: string;
  version?: string;
  environment?: string;
  redactPaths?: string[];
  prettyPrint?: boolean;
}

export interface Logger {
  debug(msg: string, obj?: any): void;
  info(msg: string, obj?: any): void;
  warn(msg: string, obj?: any): void;
  error(msg: string, obj?: any): void;
  fatal(msg: string, obj?: any): void;
  child(bindings: any): Logger;
}

export class PinoLogger implements Logger {
  private pino: pino.Logger;

  constructor(options: LoggerOptions = {}) {
    const defaultRedactPaths = [
      'authorization',
      'Authorization', 
      'set-cookie',
      'Set-Cookie',
      'cookie',
      'Cookie',
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key'
    ];

    const pinoOptions: pino.LoggerOptions = {
      level: options.level || 'info',
      base: {
        service: options.service || 'platform',
        version: options.version || '1.0.0',
        environment: options.environment || process.env.NODE_ENV || 'development'
      },
      redact: {
        paths: [...defaultRedactPaths, ...(options.redactPaths || [])],
        censor: '[REDACTED]'
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        }
      }
    };

    // Add pretty printing for development
    if (options.prettyPrint || process.env.NODE_ENV === 'development') {
      this.pino = pino(pinoOptions, pino.destination({
        sync: false
      }));
    } else {
      this.pino = pino(pinoOptions);
    }
  }

  debug(msg: string, obj?: any): void {
    this.pino.debug(obj, msg);
  }

  info(msg: string, obj?: any): void {
    this.pino.info(obj, msg);
  }

  warn(msg: string, obj?: any): void {
    this.pino.warn(obj, msg);
  }

  error(msg: string, obj?: any): void {
    this.pino.error(obj, msg);
  }

  fatal(msg: string, obj?: any): void {
    this.pino.fatal(obj, msg);
  }

  child(bindings: any): Logger {
    return new PinoLoggerChild(this.pino.child(bindings));
  }
}

class PinoLoggerChild implements Logger {
  constructor(private pino: pino.Logger) {}

  debug(msg: string, obj?: any): void {
    this.pino.debug(obj, msg);
  }

  info(msg: string, obj?: any): void {
    this.pino.info(obj, msg);
  }

  warn(msg: string, obj?: any): void {
    this.pino.warn(obj, msg);
  }

  error(msg: string, obj?: any): void {
    this.pino.error(obj, msg);
  }

  fatal(msg: string, obj?: any): void {
    this.pino.fatal(obj, msg);
  }

  child(bindings: any): Logger {
    return new PinoLoggerChild(this.pino.child(bindings));
  }
}

// Logger factory
export class LoggerFactory {
  private static defaultOptions: LoggerOptions = {};

  static configure(options: LoggerOptions): void {
    LoggerFactory.defaultOptions = options;
  }

  static create(name?: string, options?: Partial<LoggerOptions>): Logger {
    const mergedOptions = {
      ...LoggerFactory.defaultOptions,
      ...options
    };

    const logger = new PinoLogger(mergedOptions);
    
    if (name) {
      return logger.child({ name });
    }
    
    return logger;
  }
}