const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

class BackupService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.backupStrategies = new Map();
    this.backupJobs = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load backup strategies
      await this.loadBackupStrategies();
      
      // Start backup scheduler
      this.startBackupScheduler();
      
      this._initialized = true;
      logger.info('BackupService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize BackupService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('BackupService closed');
    } catch (error) {
      logger.error('Error closing BackupService:', error);
    }
  }

  async loadBackupStrategies() {
    try {
      this.backupStrategies = new Map([
        ['full', {
          name: 'Full Backup',
          description: 'Complete backup of all data',
          includes: ['database', 'files', 'redis', 'configurations'],
          frequency: 'daily',
          retention: 30,
          compression: true,
          encryption: true
        }],
        ['incremental', {
          name: 'Incremental Backup',
          description: 'Backup of changes since last backup',
          includes: ['database', 'files', 'redis'],
          frequency: 'hourly',
          retention: 7,
          compression: true,
          encryption: true
        }],
        ['differential', {
          name: 'Differential Backup',
          description: 'Backup of changes since last full backup',
          includes: ['database', 'files', 'redis'],
          frequency: 'daily',
          retention: 14,
          compression: true,
          encryption: true
        }],
        ['database_only', {
          name: 'Database Only',
          description: 'Backup of database only',
          includes: ['database'],
          frequency: 'hourly',
          retention: 7,
          compression: true,
          encryption: true
        }],
        ['files_only', {
          name: 'Files Only',
          description: 'Backup of files only',
          includes: ['files'],
          frequency: 'daily',
          retention: 30,
          compression: true,
          encryption: true
        }],
        ['config_only', {
          name: 'Configuration Only',
          description: 'Backup of configurations only',
          includes: ['configurations'],
          frequency: 'daily',
          retention: 90,
          compression: true,
          encryption: true
        }]
      ]);
      
      logger.info('Backup strategies loaded successfully');
    } catch (error) {
      logger.error('Error loading backup strategies:', error);
      throw error;
    }
  }

  startBackupScheduler() {
    // Check for scheduled backups every minute
    setInterval(async () => {
      try {
        await this.processScheduledBackups();
      } catch (error) {
        logger.error('Error processing scheduled backups:', error);
      }
    }, 60000);
  }

  async createBackup(strategy, options = {}) {
    try {
      const backupId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting backup: ${backupId}`, { strategy, options });
      
      const backupStrategy = this.backupStrategies.get(strategy);
      if (!backupStrategy) {
        throw new Error(`Unknown backup strategy: ${strategy}`);
      }
      
      const backup = {
        id: backupId,
        strategy: strategy,
        status: 'running',
        startTime: startTime,
        endTime: null,
        duration: 0,
        size: 0,
        files: [],
        errors: [],
        options: options
      };
      
      // Store backup record
      await this.storeBackupRecord(backup);
      
      try {
        // Create backup directory
        const backupDir = await this.createBackupDirectory(backupId);
        
        // Perform backup based on strategy
        const backupResult = await this.performBackup(backup, backupDir, backupStrategy);
        
        // Update backup record
        backup.status = 'completed';
        backup.endTime = Date.now();
        backup.duration = backup.endTime - backup.startTime;
        backup.size = backupResult.size;
        backup.files = backupResult.files;
        
        await this.updateBackupRecord(backup);
        
        this.emit('backupCompleted', backup);
        
        logger.info(`Backup completed: ${backupId}`, {
          strategy: strategy,
          duration: backup.duration,
          size: backup.size,
          files: backup.files.length
        });
        
        return backup;
      } catch (error) {
        // Update backup record with error
        backup.status = 'failed';
        backup.endTime = Date.now();
        backup.duration = backup.endTime - backup.startTime;
        backup.errors.push(error.message);
        
        await this.updateBackupRecord(backup);
        
        this.emit('backupFailed', { backup, error });
        
        logger.error(`Backup failed: ${backupId}`, { error: error.message });
        
        throw error;
      }
    } catch (error) {
      logger.error('Error creating backup:', error);
      throw error;
    }
  }

  async performBackup(backup, backupDir, strategy) {
    try {
      const result = {
        size: 0,
        files: []
      };
      
      // Backup database
      if (strategy.includes.includes('database')) {
        const dbBackup = await this.backupDatabase(backupDir);
        result.files.push(dbBackup);
        result.size += dbBackup.size;
      }
      
      // Backup files
      if (strategy.includes.includes('files')) {
        const filesBackup = await this.backupFiles(backupDir);
        result.files.push(...filesBackup);
        result.size += filesBackup.reduce((sum, file) => sum + file.size, 0);
      }
      
      // Backup Redis
      if (strategy.includes.includes('redis')) {
        const redisBackup = await this.backupRedis(backupDir);
        result.files.push(redisBackup);
        result.size += redisBackup.size;
      }
      
      // Backup configurations
      if (strategy.includes.includes('configurations')) {
        const configBackup = await this.backupConfigurations(backupDir);
        result.files.push(configBackup);
        result.size += configBackup.size;
      }
      
      // Compress backup if enabled
      if (strategy.compression) {
        const compressedBackup = await this.compressBackup(backupDir);
        result.files.push(compressedBackup);
        result.size = compressedBackup.size;
      }
      
      // Encrypt backup if enabled
      if (strategy.encryption) {
        const encryptedBackup = await this.encryptBackup(backupDir);
        result.files.push(encryptedBackup);
        result.size = encryptedBackup.size;
      }
      
      return result;
    } catch (error) {
      logger.error('Error performing backup:', error);
      throw error;
    }
  }

  async backupDatabase(backupDir) {
    try {
      const dbBackupFile = path.join(backupDir, 'database.sql');
      
      // Use pg_dump to backup database
      const execAsync = promisify(exec);
      const command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${dbBackupFile}`;
      
      await execAsync(command);
      
      const stats = await fs.stat(dbBackupFile);
      
      return {
        name: 'database.sql',
        path: dbBackupFile,
        size: stats.size,
        type: 'database'
      };
    } catch (error) {
      logger.error('Error backing up database:', error);
      throw error;
    }
  }

  async backupFiles(backupDir) {
    try {
      const filesDir = path.join(backupDir, 'files');
      await fs.mkdir(filesDir, { recursive: true });
      
      const filesToBackup = [
        'uploads',
        'exports',
        'reports',
        'templates',
        'logs'
      ];
      
      const backupFiles = [];
      
      for (const dir of filesToBackup) {
        const sourceDir = path.join(process.cwd(), dir);
        const targetDir = path.join(filesDir, dir);
        
        try {
          await fs.access(sourceDir);
          await this.copyDirectory(sourceDir, targetDir);
          
          const stats = await this.getDirectorySize(targetDir);
          backupFiles.push({
            name: dir,
            path: targetDir,
            size: stats.size,
            type: 'files'
          });
        } catch (error) {
          logger.warn(`Directory not found or accessible: ${sourceDir}`);
        }
      }
      
      return backupFiles;
    } catch (error) {
      logger.error('Error backing up files:', error);
      throw error;
    }
  }

  async backupRedis(backupDir) {
    try {
      const redisBackupFile = path.join(backupDir, 'redis.rdb');
      
      // Trigger Redis BGSAVE
      await this.redis.bgsave();
      
      // Wait for background save to complete
      await new Promise((resolve, reject) => {
        const checkSave = () => {
          this.redis.lastsave().then((lastSave) => {
            if (lastSave > Date.now() / 1000 - 10) {
              resolve();
            } else {
              setTimeout(checkSave, 1000);
            }
          }).catch(reject);
        };
        checkSave();
      });
      
      // Copy Redis dump file
      const redisDumpFile = process.env.REDIS_DUMP_FILE || '/var/lib/redis/dump.rdb';
      await fs.copyFile(redisDumpFile, redisBackupFile);
      
      const stats = await fs.stat(redisBackupFile);
      
      return {
        name: 'redis.rdb',
        path: redisBackupFile,
        size: stats.size,
        type: 'redis'
      };
    } catch (error) {
      logger.error('Error backing up Redis:', error);
      throw error;
    }
  }

  async backupConfigurations(backupDir) {
    try {
      const configBackupFile = path.join(backupDir, 'configurations.json');
      
      // Export all configurations
      const query = 'SELECT * FROM configurations WHERE active = true';
      const result = await pool.query(query);
      
      const configurations = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        value: row.value,
        schema: row.schema,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      await fs.writeFile(configBackupFile, JSON.stringify(configurations, null, 2));
      
      const stats = await fs.stat(configBackupFile);
      
      return {
        name: 'configurations.json',
        path: configBackupFile,
        size: stats.size,
        type: 'configurations'
      };
    } catch (error) {
      logger.error('Error backing up configurations:', error);
      throw error;
    }
  }

  async compressBackup(backupDir) {
    try {
      const compressedFile = `${backupDir}.tar.gz`;
      
      // Create tar.gz archive
      const execAsync = promisify(exec);
      const command = `tar -czf ${compressedFile} -C ${path.dirname(backupDir)} ${path.basename(backupDir)}`;
      
      await execAsync(command);
      
      const stats = await fs.stat(compressedFile);
      
      return {
        name: path.basename(compressedFile),
        path: compressedFile,
        size: stats.size,
        type: 'compressed'
      };
    } catch (error) {
      logger.error('Error compressing backup:', error);
      throw error;
    }
  }

  async encryptBackup(backupDir) {
    try {
      const encryptedFile = `${backupDir}.enc`;
      
      // This would use the EncryptionService
      // For now, we'll just copy the file
      await fs.copyFile(backupDir, encryptedFile);
      
      const stats = await fs.stat(encryptedFile);
      
      return {
        name: path.basename(encryptedFile),
        path: encryptedFile,
        size: stats.size,
        type: 'encrypted'
      };
    } catch (error) {
      logger.error('Error encrypting backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId, targetDir = null) {
    try {
      logger.info(`Starting restore: ${backupId}`);
      
      // Get backup record
      const backup = await this.getBackupRecord(backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      if (backup.status !== 'completed') {
        throw new Error(`Backup not completed: ${backupId}`);
      }
      
      const restoreDir = targetDir || path.join(process.cwd(), 'restore', backupId);
      await fs.mkdir(restoreDir, { recursive: true });
      
      // Restore based on backup files
      for (const file of backup.files) {
        await this.restoreFile(file, restoreDir);
      }
      
      logger.info(`Restore completed: ${backupId}`);
      
      return {
        backupId: backupId,
        restoreDir: restoreDir,
        files: backup.files
      };
    } catch (error) {
      logger.error('Error restoring backup:', error);
      throw error;
    }
  }

  async restoreFile(file, restoreDir) {
    try {
      const targetPath = path.join(restoreDir, file.name);
      
      switch (file.type) {
        case 'database':
          await this.restoreDatabase(file.path);
          break;
        case 'files':
          await this.copyDirectory(file.path, targetPath);
          break;
        case 'redis':
          await this.restoreRedis(file.path);
          break;
        case 'configurations':
          await this.restoreConfigurations(file.path);
          break;
        default:
          await fs.copyFile(file.path, targetPath);
      }
    } catch (error) {
      logger.error('Error restoring file:', error);
      throw error;
    }
  }

  async restoreDatabase(dbBackupFile) {
    try {
      const execAsync = promisify(exec);
      const command = `psql -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${dbBackupFile}`;
      
      await execAsync(command);
      
      logger.info('Database restored successfully');
    } catch (error) {
      logger.error('Error restoring database:', error);
      throw error;
    }
  }

  async restoreRedis(redisBackupFile) {
    try {
      // Stop Redis
      const execAsync = promisify(exec);
      await execAsync('systemctl stop redis');
      
      // Copy backup file
      const redisDumpFile = process.env.REDIS_DUMP_FILE || '/var/lib/redis/dump.rdb';
      await fs.copyFile(redisBackupFile, redisDumpFile);
      
      // Start Redis
      await execAsync('systemctl start redis');
      
      logger.info('Redis restored successfully');
    } catch (error) {
      logger.error('Error restoring Redis:', error);
      throw error;
    }
  }

  async restoreConfigurations(configBackupFile) {
    try {
      const configData = await fs.readFile(configBackupFile, 'utf8');
      const configurations = JSON.parse(configData);
      
      for (const config of configurations) {
        const query = `
          INSERT INTO configurations (id, name, value, schema, version, created_at, updated_at, active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            value = EXCLUDED.value,
            schema = EXCLUDED.schema,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at
        `;
        
        await pool.query(query, [
          config.id,
          config.name,
          config.value,
          config.schema,
          config.version,
          config.createdAt,
          config.updatedAt,
          true
        ]);
      }
      
      logger.info('Configurations restored successfully');
    } catch (error) {
      logger.error('Error restoring configurations:', error);
      throw error;
    }
  }

  async createBackupDirectory(backupId) {
    try {
      const backupDir = path.join(process.cwd(), 'backups', backupId);
      await fs.mkdir(backupDir, { recursive: true });
      return backupDir;
    } catch (error) {
      logger.error('Error creating backup directory:', error);
      throw error;
    }
  }

  async copyDirectory(source, target) {
    try {
      await fs.mkdir(target, { recursive: true });
      
      const entries = await fs.readdir(source, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        
        if (entry.isDirectory()) {
          await this.copyDirectory(sourcePath, targetPath);
        } else {
          await fs.copyFile(sourcePath, targetPath);
        }
      }
    } catch (error) {
      logger.error('Error copying directory:', error);
      throw error;
    }
  }

  async getDirectorySize(dir) {
    try {
      let totalSize = 0;
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subSize = await this.getDirectorySize(entryPath);
          totalSize += subSize.size;
        } else {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
        }
      }
      
      return { size: totalSize };
    } catch (error) {
      logger.error('Error getting directory size:', error);
      throw error;
    }
  }

  async storeBackupRecord(backup) {
    try {
      const query = `
        INSERT INTO backups (
          id, strategy, status, start_time, end_time, duration, 
          size, files, errors, options, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(query, [
        backup.id,
        backup.strategy,
        backup.status,
        new Date(backup.startTime).toISOString(),
        backup.endTime ? new Date(backup.endTime).toISOString() : null,
        backup.duration,
        backup.size,
        JSON.stringify(backup.files),
        JSON.stringify(backup.errors),
        JSON.stringify(backup.options),
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing backup record:', error);
      throw error;
    }
  }

  async updateBackupRecord(backup) {
    try {
      const query = `
        UPDATE backups 
        SET status = $1, end_time = $2, duration = $3, size = $4, 
            files = $5, errors = $6, updated_at = $7
        WHERE id = $8
      `;
      
      await pool.query(query, [
        backup.status,
        backup.endTime ? new Date(backup.endTime).toISOString() : null,
        backup.duration,
        backup.size,
        JSON.stringify(backup.files),
        JSON.stringify(backup.errors),
        new Date().toISOString(),
        backup.id
      ]);
    } catch (error) {
      logger.error('Error updating backup record:', error);
      throw error;
    }
  }

  async getBackupRecord(backupId) {
    try {
      const query = 'SELECT * FROM backups WHERE id = $1';
      const result = await pool.query(query, [backupId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        strategy: row.strategy,
        status: row.status,
        startTime: new Date(row.start_time).getTime(),
        endTime: row.end_time ? new Date(row.end_time).getTime() : null,
        duration: row.duration,
        size: row.size,
        files: row.files,
        errors: row.errors,
        options: row.options,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Error getting backup record:', error);
      throw error;
    }
  }

  async getBackups(filters = {}, pagination = {}) {
    try {
      let query = 'SELECT * FROM backups WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      // Apply filters
      if (filters.strategy) {
        paramCount++;
        query += ` AND strategy = $${paramCount}`;
        params.push(filters.strategy);
      }
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.startDate) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        paramCount++;
        query += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
      }
      
      // Apply sorting
      query += ' ORDER BY created_at DESC';
      
      // Apply pagination
      if (pagination.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(pagination.limit);
        
        if (pagination.offset) {
          paramCount++;
          query += ` OFFSET $${paramCount}`;
          params.push(pagination.offset);
        }
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        strategy: row.strategy,
        status: row.status,
        startTime: new Date(row.start_time).getTime(),
        endTime: row.end_time ? new Date(row.end_time).getTime() : null,
        duration: row.duration,
        size: row.size,
        files: row.files,
        errors: row.errors,
        options: row.options,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting backups:', error);
      throw error;
    }
  }

  async deleteBackup(backupId) {
    try {
      // Get backup record
      const backup = await this.getBackupRecord(backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      // Delete backup files
      for (const file of backup.files) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          logger.warn(`Failed to delete backup file: ${file.path}`, error.message);
        }
      }
      
      // Delete backup directory
      const backupDir = path.join(process.cwd(), 'backups', backupId);
      try {
        await fs.rmdir(backupDir, { recursive: true });
      } catch (error) {
        logger.warn(`Failed to delete backup directory: ${backupDir}`, error.message);
      }
      
      // Delete backup record
      const query = 'DELETE FROM backups WHERE id = $1';
      await pool.query(query, [backupId]);
      
      logger.info(`Backup deleted: ${backupId}`);
    } catch (error) {
      logger.error('Error deleting backup:', error);
      throw error;
    }
  }

  async processScheduledBackups() {
    try {
      const query = `
        SELECT * FROM backup_schedules 
        WHERE enabled = true AND next_run <= NOW()
      `;
      
      const result = await pool.query(query);
      
      for (const schedule of result.rows) {
        try {
          await this.createBackup(schedule.strategy, schedule.options);
          
          // Update next run time
          const nextRun = this.calculateNextRun(schedule.frequency, schedule.interval);
          await this.updateBackupSchedule(schedule.id, { nextRun });
        } catch (error) {
          logger.error(`Error processing scheduled backup ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled backups:', error);
      throw error;
    }
  }

  calculateNextRun(frequency, interval) {
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + interval * 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + interval * 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  async updateBackupSchedule(scheduleId, updates) {
    try {
      const query = `
        UPDATE backup_schedules 
        SET next_run = $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(query, [
        updates.nextRun,
        new Date().toISOString(),
        scheduleId
      ]);
    } catch (error) {
      logger.error('Error updating backup schedule:', error);
      throw error;
    }
  }

  async getBackupStrategies() {
    try {
      return Array.from(this.backupStrategies.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting backup strategies:', error);
      throw error;
    }
  }

  async getBackupStats() {
    try {
      const query = `
        SELECT 
          strategy,
          status,
          COUNT(*) as count,
          AVG(duration) as avg_duration,
          AVG(size) as avg_size
        FROM backups 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY strategy, status
        ORDER BY strategy, status
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting backup stats:', error);
      throw error;
    }
  }
}

module.exports = BackupService;
