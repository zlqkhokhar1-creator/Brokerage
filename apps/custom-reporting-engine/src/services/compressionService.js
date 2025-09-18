const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const zlib = require('zlib');
const { promisify } = require('util');

class CompressionService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.compressionAlgorithms = new Map();
    this.compressionCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load compression algorithms
      await this.loadCompressionAlgorithms();
      
      this._initialized = true;
      logger.info('CompressionService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CompressionService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('CompressionService closed');
    } catch (error) {
      logger.error('Error closing CompressionService:', error);
    }
  }

  async loadCompressionAlgorithms() {
    try {
      this.compressionAlgorithms = new Map([
        ['gzip', {
          name: 'GZIP',
          description: 'GZIP compression algorithm',
          extension: '.gz',
          mimeType: 'application/gzip',
          level: 6,
          windowBits: 15,
          memLevel: 8,
          strategy: 0,
          compress: promisify(zlib.gzip),
          decompress: promisify(zlib.gunzip)
        }],
        ['deflate', {
          name: 'DEFLATE',
          description: 'DEFLATE compression algorithm',
          extension: '.deflate',
          mimeType: 'application/deflate',
          level: 6,
          windowBits: 15,
          memLevel: 8,
          strategy: 0,
          compress: promisify(zlib.deflate),
          decompress: promisify(zlib.inflate)
        }],
        ['brotli', {
          name: 'Brotli',
          description: 'Brotli compression algorithm',
          extension: '.br',
          mimeType: 'application/brotli',
          level: 6,
          windowBits: 15,
          memLevel: 8,
          strategy: 0,
          compress: promisify(zlib.brotliCompress),
          decompress: promisify(zlib.brotliDecompress)
        }],
        ['lz4', {
          name: 'LZ4',
          description: 'LZ4 compression algorithm',
          extension: '.lz4',
          mimeType: 'application/lz4',
          level: 6,
          windowBits: 15,
          memLevel: 8,
          strategy: 0,
          compress: promisify(zlib.lz4Compress),
          decompress: promisify(zlib.lz4Decompress)
        }],
        ['zstd', {
          name: 'Zstandard',
          description: 'Zstandard compression algorithm',
          extension: '.zst',
          mimeType: 'application/zstd',
          level: 6,
          windowBits: 15,
          memLevel: 8,
          strategy: 0,
          compress: promisify(zlib.zstdCompress),
          decompress: promisify(zlib.zstdDecompress)
        }]
      ]);
      
      logger.info('Compression algorithms loaded successfully');
    } catch (error) {
      logger.error('Error loading compression algorithms:', error);
      throw error;
    }
  }

  async compress(data, algorithm = 'gzip', options = {}) {
    try {
      const algo = this.compressionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Compression algorithm not supported: ${algorithm}`);
      }
      
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const startTime = Date.now();
      
      // Prepare compression options
      const compressOptions = {
        level: options.level || algo.level,
        windowBits: options.windowBits || algo.windowBits,
        memLevel: options.memLevel || algo.memLevel,
        strategy: options.strategy || algo.strategy
      };
      
      // Compress data
      const compressed = await algo.compress(dataBuffer, compressOptions);
      const duration = Date.now() - startTime;
      
      const result = {
        data: compressed,
        algorithm: algorithm,
        originalSize: dataBuffer.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / dataBuffer.length) * 100,
        duration: duration,
        timestamp: Date.now()
      };
      
      this.emit('dataCompressed', result);
      
      logger.debug(`Data compressed with ${algorithm}`, {
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      logger.error('Error compressing data:', error);
      throw error;
    }
  }

  async decompress(compressedData, algorithm = 'gzip') {
    try {
      const algo = this.compressionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Compression algorithm not supported: ${algorithm}`);
      }
      
      const dataBuffer = Buffer.isBuffer(compressedData) ? compressedData : Buffer.from(compressedData);
      const startTime = Date.now();
      
      // Decompress data
      const decompressed = await algo.decompress(dataBuffer);
      const duration = Date.now() - startTime;
      
      const result = {
        data: decompressed,
        algorithm: algorithm,
        compressedSize: dataBuffer.length,
        decompressedSize: decompressed.length,
        duration: duration,
        timestamp: Date.now()
      };
      
      this.emit('dataDecompressed', result);
      
      logger.debug(`Data decompressed with ${algorithm}`, {
        compressedSize: result.compressedSize,
        decompressedSize: result.decompressedSize,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      logger.error('Error decompressing data:', error);
      throw error;
    }
  }

  async compressFile(inputPath, outputPath, algorithm = 'gzip', options = {}) {
    try {
      const fs = require('fs').promises;
      
      // Read input file
      const inputData = await fs.readFile(inputPath);
      
      // Compress data
      const compressed = await this.compress(inputData, algorithm, options);
      
      // Write compressed file
      await fs.writeFile(outputPath, compressed.data);
      
      logger.info(`File compressed: ${inputPath} -> ${outputPath}`, {
        algorithm: algorithm,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio
      });
      
      return compressed;
    } catch (error) {
      logger.error('Error compressing file:', error);
      throw error;
    }
  }

  async decompressFile(inputPath, outputPath, algorithm = 'gzip') {
    try {
      const fs = require('fs').promises;
      
      // Read compressed file
      const compressedData = await fs.readFile(inputPath);
      
      // Decompress data
      const decompressed = await this.decompress(compressedData, algorithm);
      
      // Write decompressed file
      await fs.writeFile(outputPath, decompressed.data);
      
      logger.info(`File decompressed: ${inputPath} -> ${outputPath}`, {
        algorithm: algorithm,
        compressedSize: decompressed.compressedSize,
        decompressedSize: decompressed.decompressedSize
      });
      
      return decompressed;
    } catch (error) {
      logger.error('Error decompressing file:', error);
      throw error;
    }
  }

  async compressStream(inputStream, outputStream, algorithm = 'gzip', options = {}) {
    try {
      const algo = this.compressionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Compression algorithm not supported: ${algorithm}`);
      }
      
      // Prepare compression options
      const compressOptions = {
        level: options.level || algo.level,
        windowBits: options.windowBits || algo.windowBits,
        memLevel: options.memLevel || algo.memLevel,
        strategy: options.strategy || algo.strategy
      };
      
      // Create compression stream
      const compressStream = zlib.createGzip(compressOptions);
      
      // Pipe input to compression stream
      inputStream.pipe(compressStream);
      
      // Pipe compression stream to output
      compressStream.pipe(outputStream);
      
      return new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
        compressStream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error compressing stream:', error);
      throw error;
    }
  }

  async decompressStream(inputStream, outputStream, algorithm = 'gzip') {
    try {
      const algo = this.compressionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Compression algorithm not supported: ${algorithm}`);
      }
      
      // Create decompression stream
      const decompressStream = zlib.createGunzip();
      
      // Pipe input to decompression stream
      inputStream.pipe(decompressStream);
      
      // Pipe decompression stream to output
      decompressStream.pipe(outputStream);
      
      return new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
        decompressStream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error decompressing stream:', error);
      throw error;
    }
  }

  async getCompressionRatio(data, algorithm = 'gzip', options = {}) {
    try {
      const compressed = await this.compress(data, algorithm, options);
      return compressed.compressionRatio;
    } catch (error) {
      logger.error('Error getting compression ratio:', error);
      throw error;
    }
  }

  async findBestCompressionAlgorithm(data, algorithms = ['gzip', 'deflate', 'brotli', 'lz4', 'zstd']) {
    try {
      const results = [];
      
      for (const algorithm of algorithms) {
        try {
          const compressed = await this.compress(data, algorithm);
          results.push({
            algorithm: algorithm,
            compressedSize: compressed.compressedSize,
            compressionRatio: compressed.compressionRatio,
            duration: compressed.duration
          });
        } catch (error) {
          logger.warn(`Failed to compress with ${algorithm}:`, error.message);
        }
      }
      
      // Sort by compression ratio (best first)
      results.sort((a, b) => a.compressionRatio - b.compressionRatio);
      
      return results[0];
    } catch (error) {
      logger.error('Error finding best compression algorithm:', error);
      throw error;
    }
  }

  async compressWithCache(data, algorithm = 'gzip', options = {}) {
    try {
      const cacheKey = this.generateCacheKey(data, algorithm, options);
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        logger.debug(`Compression cache hit: ${cacheKey}`);
        return result;
      }
      
      // Compress data
      const result = await this.compress(data, algorithm, options);
      
      // Cache result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      
      logger.debug(`Compression cached: ${cacheKey}`);
      
      return result;
    } catch (error) {
      logger.error('Error compressing with cache:', error);
      throw error;
    }
  }

  async decompressWithCache(compressedData, algorithm = 'gzip') {
    try {
      const cacheKey = this.generateCacheKey(compressedData, algorithm, { decompress: true });
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        logger.debug(`Decompression cache hit: ${cacheKey}`);
        return result;
      }
      
      // Decompress data
      const result = await this.decompress(compressedData, algorithm);
      
      // Cache result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      
      logger.debug(`Decompression cached: ${cacheKey}`);
      
      return result;
    } catch (error) {
      logger.error('Error decompressing with cache:', error);
      throw error;
    }
  }

  generateCacheKey(data, algorithm, options = {}) {
    const dataHash = require('crypto').createHash('md5').update(data).digest('hex');
    const optionsHash = require('crypto').createHash('md5').update(JSON.stringify(options)).digest('hex');
    return `compression:${algorithm}:${dataHash}:${optionsHash}`;
  }

  async getCompressionAlgorithms() {
    try {
      return Array.from(this.compressionAlgorithms.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting compression algorithms:', error);
      throw error;
    }
  }

  async getCompressionStats() {
    try {
      const query = `
        SELECT 
          algorithm,
          COUNT(*) as total_compressions,
          AVG(compression_ratio) as avg_compression_ratio,
          AVG(duration) as avg_duration,
          SUM(original_size) as total_original_size,
          SUM(compressed_size) as total_compressed_size
        FROM compression_logs 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY algorithm
        ORDER BY total_compressions DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting compression stats:', error);
      throw error;
    }
  }

  async storeCompressionLog(compressionResult) {
    try {
      const query = `
        INSERT INTO compression_logs (
          id, algorithm, original_size, compressed_size, compression_ratio, 
          duration, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        nanoid(),
        compressionResult.algorithm,
        compressionResult.originalSize,
        compressionResult.compressedSize,
        compressionResult.compressionRatio,
        compressionResult.duration,
        new Date(compressionResult.timestamp).toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing compression log:', error);
      throw error;
    }
  }

  async clearCompressionCache() {
    try {
      const pattern = 'compression:*';
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      logger.info(`Compression cache cleared: ${keys.length} keys`);
    } catch (error) {
      logger.error('Error clearing compression cache:', error);
      throw error;
    }
  }

  async getCompressionCacheStats() {
    try {
      const pattern = 'compression:*';
      const keys = await this.redis.keys(pattern);
      
      let totalSize = 0;
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          totalSize += data.length;
        }
      }
      
      return {
        keyCount: keys.length,
        totalSize: totalSize,
        avgSize: keys.length > 0 ? totalSize / keys.length : 0
      };
    } catch (error) {
      logger.error('Error getting compression cache stats:', error);
      throw error;
    }
  }
}

module.exports = CompressionService;
