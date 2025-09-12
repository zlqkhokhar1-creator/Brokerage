import jwt from 'jsonwebtoken';

export interface JWTPayload {
  sub: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export interface JWTVerifyOptions {
  secret: string;
  algorithms?: string[];
  issuer?: string;
  audience?: string;
  clockTolerance?: number;
}

export interface JWTHelper {
  verify(token: string, options: JWTVerifyOptions): Promise<JWTPayload>;
  decode(token: string): JWTPayload | null;
}

export class JWTVerifier implements JWTHelper {
  async verify(token: string, options: JWTVerifyOptions): Promise<JWTPayload> {
    return new Promise((resolve, reject) => {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: (options.algorithms as jwt.Algorithm[]) || ['HS256'],
        issuer: options.issuer,
        audience: options.audience,
        clockTolerance: options.clockTolerance
      };

      jwt.verify(token, options.secret, verifyOptions, (error, decoded) => {
        if (error) {
          reject(new Error(`JWT verification failed: ${error.message}`));
        } else {
          resolve(decoded as JWTPayload);
        }
      });
    });
  }

  decode(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}

// Service token helper for service-to-service authentication
export class ServiceTokenVerifier {
  private serviceSecret: string;

  constructor(serviceSecret: string) {
    this.serviceSecret = serviceSecret;
  }

  verifyServiceToken(token: string): boolean {
    // Simple secret comparison for service tokens
    // In production, this could be a more sophisticated JWT-based approach
    return token === this.serviceSecret;
  }

  isValidServiceRequest(headers: Record<string, string | string[] | undefined>): boolean {
    const serviceToken = headers['x-service-token'];
    
    if (typeof serviceToken !== 'string') {
      return false;
    }

    return this.verifyServiceToken(serviceToken);
  }
}