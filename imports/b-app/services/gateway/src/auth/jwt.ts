import jwt from 'jsonwebtoken';
import { loadEnv } from '@config/env';
import { FastifyRequest, FastifyReply } from 'fastify';

const env = loadEnv();

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function verifyJWT(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function signJWT(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
}

export async function authenticateJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        success: false,
        error: 'Authorization header required',
        traceId: request.headers['x-request-id']
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    
    // Add user info to request context
    (request as any).user = payload;
  } catch (error) {
    reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
      traceId: request.headers['x-request-id']
    });
  }
}