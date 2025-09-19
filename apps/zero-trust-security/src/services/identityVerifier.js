const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const crypto = require('crypto');

class IdentityVerifier {
  async verifyIdentity(req, res) {
    try {
      const { userId, verificationType, verificationData } = req.body;
      
      let verificationResult;
      
      switch (verificationType) {
        case 'biometric':
          verificationResult = await this.verifyBiometric(userId, verificationData);
          break;
        case 'document':
          verificationResult = await this.verifyDocument(userId, verificationData);
          break;
        case 'multi_factor':
          verificationResult = await this.verifyMultiFactor(userId, verificationData);
          break;
        case 'behavioral':
          verificationResult = await this.verifyBehavioral(userId, verificationData);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Unsupported verification type'
          });
      }
      
      if (verificationResult.success) {
        // Update user verification status
        await this.updateVerificationStatus(userId, verificationType, true);
        
        // Log verification event
        await this.logVerificationEvent(userId, verificationType, 'success');
      } else {
        // Log failed verification attempt
        await this.logVerificationEvent(userId, verificationType, 'failed');
      }
      
      res.json({
        success: verificationResult.success,
        data: verificationResult.data,
        error: verificationResult.error
      });
    } catch (error) {
      logger.error('Error verifying identity:', error);
      res.status(500).json({ success: false, error: 'Identity verification failed' });
    }
  }

  async verifyBiometric(userId, biometricData) {
    try {
      const { fingerprint, faceId, voiceId } = biometricData;
      
      // Get stored biometric templates
      const query = 'SELECT * FROM user_biometrics WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No biometric data found for user'
        };
      }
      
      const storedBiometrics = result.rows[0];
      let verificationScore = 0;
      let verifiedFactors = 0;
      
      // Verify fingerprint
      if (fingerprint && storedBiometrics.fingerprint_template) {
        const fingerprintMatch = await this.compareBiometricTemplate(
          fingerprint, 
          storedBiometrics.fingerprint_template
        );
        if (fingerprintMatch) {
          verificationScore += 0.4;
          verifiedFactors++;
        }
      }
      
      // Verify face
      if (faceId && storedBiometrics.face_template) {
        const faceMatch = await this.compareBiometricTemplate(
          faceId, 
          storedBiometrics.face_template
        );
        if (faceMatch) {
          verificationScore += 0.4;
          verifiedFactors++;
        }
      }
      
      // Verify voice
      if (voiceId && storedBiometrics.voice_template) {
        const voiceMatch = await this.compareBiometricTemplate(
          voiceId, 
          storedBiometrics.voice_template
        );
        if (voiceMatch) {
          verificationScore += 0.2;
          verifiedFactors++;
        }
      }
      
      const isVerified = verificationScore >= 0.7 && verifiedFactors >= 2;
      
      return {
        success: isVerified,
        data: {
          verificationScore,
          verifiedFactors,
          totalFactors: 3
        },
        error: isVerified ? null : 'Biometric verification failed'
      };
    } catch (error) {
      logger.error('Error verifying biometric:', error);
      return {
        success: false,
        error: 'Biometric verification failed'
      };
    }
  }

  async verifyDocument(userId, documentData) {
    try {
      const { documentType, documentNumber, documentImage } = documentData;
      
      // Get stored document information
      const query = 'SELECT * FROM user_documents WHERE user_id = $1 AND document_type = $2';
      const result = await database.query(query, [userId, documentType]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No document found for verification'
        };
      }
      
      const storedDocument = result.rows[0];
      
      // Verify document number
      if (storedDocument.document_number !== documentNumber) {
        return {
          success: false,
          error: 'Document number mismatch'
        };
      }
      
      // Verify document image (simplified)
      const imageVerification = await this.verifyDocumentImage(documentImage, storedDocument.document_image);
      
      if (!imageVerification) {
        return {
          success: false,
          error: 'Document image verification failed'
        };
      }
      
      return {
        success: true,
        data: {
          documentType,
          documentNumber,
          verifiedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error verifying document:', error);
      return {
        success: false,
        error: 'Document verification failed'
      };
    }
  }

  async verifyMultiFactor(userId, mfaData) {
    try {
      const { code, method } = mfaData;
      
      // Get user's MFA settings
      const query = 'SELECT * FROM user_mfa_settings WHERE user_id = $1 AND method = $2 AND is_active = true';
      const result = await database.query(query, [userId, method]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'MFA method not configured for user'
        };
      }
      
      const mfaSetting = result.rows[0];
      
      // Verify the code based on method
      let isValid = false;
      
      switch (method) {
        case 'sms':
          isValid = await this.verifySMSCode(userId, code);
          break;
        case 'email':
          isValid = await this.verifyEmailCode(userId, code);
          break;
        case 'totp':
          isValid = await this.verifyTOTPCode(mfaSetting.secret, code);
          break;
        case 'push':
          isValid = await this.verifyPushNotification(userId, code);
          break;
        default:
          return {
            success: false,
            error: 'Unsupported MFA method'
          };
      }
      
      return {
        success: isValid,
        data: {
          method,
          verifiedAt: new Date().toISOString()
        },
        error: isValid ? null : 'MFA verification failed'
      };
    } catch (error) {
      logger.error('Error verifying multi-factor:', error);
      return {
        success: false,
        error: 'Multi-factor verification failed'
      };
    }
  }

  async verifyBehavioral(userId, behavioralData) {
    try {
      const { typingPattern, mouseMovement, deviceUsage } = behavioralData;
      
      // Get stored behavioral patterns
      const query = 'SELECT * FROM user_behavioral_patterns WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No behavioral patterns found for user'
        };
      }
      
      const storedPatterns = result.rows[0];
      let verificationScore = 0;
      let verifiedFactors = 0;
      
      // Verify typing pattern
      if (typingPattern && storedPatterns.typing_pattern) {
        const typingMatch = await this.compareBehavioralPattern(
          typingPattern, 
          storedPatterns.typing_pattern
        );
        if (typingMatch) {
          verificationScore += 0.4;
          verifiedFactors++;
        }
      }
      
      // Verify mouse movement
      if (mouseMovement && storedPatterns.mouse_movement) {
        const mouseMatch = await this.compareBehavioralPattern(
          mouseMovement, 
          storedPatterns.mouse_movement
        );
        if (mouseMatch) {
          verificationScore += 0.3;
          verifiedFactors++;
        }
      }
      
      // Verify device usage
      if (deviceUsage && storedPatterns.device_usage) {
        const deviceMatch = await this.compareBehavioralPattern(
          deviceUsage, 
          storedPatterns.device_usage
        );
        if (deviceMatch) {
          verificationScore += 0.3;
          verifiedFactors++;
        }
      }
      
      const isVerified = verificationScore >= 0.6 && verifiedFactors >= 2;
      
      return {
        success: isVerified,
        data: {
          verificationScore,
          verifiedFactors,
          totalFactors: 3
        },
        error: isVerified ? null : 'Behavioral verification failed'
      };
    } catch (error) {
      logger.error('Error verifying behavioral:', error);
      return {
        success: false,
        error: 'Behavioral verification failed'
      };
    }
  }

  async compareBiometricTemplate(input, stored) {
    try {
      // Simplified biometric comparison
      // In a real implementation, this would use specialized biometric algorithms
      const inputHash = crypto.createHash('sha256').update(input).digest('hex');
      const storedHash = crypto.createHash('sha256').update(stored).digest('hex');
      
      // Calculate similarity score
      const similarity = this.calculateSimilarity(inputHash, storedHash);
      return similarity > 0.8; // 80% similarity threshold
    } catch (error) {
      logger.error('Error comparing biometric template:', error);
      return false;
    }
  }

  async compareBehavioralPattern(input, stored) {
    try {
      // Simplified behavioral pattern comparison
      const inputHash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
      const storedHash = crypto.createHash('sha256').update(JSON.stringify(stored)).digest('hex');
      
      const similarity = this.calculateSimilarity(inputHash, storedHash);
      return similarity > 0.7; // 70% similarity threshold
    } catch (error) {
      logger.error('Error comparing behavioral pattern:', error);
      return false;
    }
  }

  calculateSimilarity(hash1, hash2) {
    let matches = 0;
    const length = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < length; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }
    
    return matches / length;
  }

  async verifyDocumentImage(inputImage, storedImage) {
    try {
      // Simplified document image verification
      // In a real implementation, this would use OCR and image comparison
      return true; // Placeholder
    } catch (error) {
      logger.error('Error verifying document image:', error);
      return false;
    }
  }

  async verifySMSCode(userId, code) {
    try {
      const key = `sms_code:${userId}`;
      const storedCode = await redis.get(key);
      
      if (!storedCode || storedCode !== code) {
        return false;
      }
      
      // Remove code after verification
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error verifying SMS code:', error);
      return false;
    }
  }

  async verifyEmailCode(userId, code) {
    try {
      const key = `email_code:${userId}`;
      const storedCode = await redis.get(key);
      
      if (!storedCode || storedCode !== code) {
        return false;
      }
      
      // Remove code after verification
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error verifying email code:', error);
      return false;
    }
  }

  async verifyTOTPCode(secret, code) {
    try {
      const totp = require('totp-generator');
      const currentCode = totp(secret);
      
      return currentCode === code;
    } catch (error) {
      logger.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  async verifyPushNotification(userId, code) {
    try {
      const key = `push_code:${userId}`;
      const storedCode = await redis.get(key);
      
      if (!storedCode || storedCode !== code) {
        return false;
      }
      
      // Remove code after verification
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error verifying push notification:', error);
      return false;
    }
  }

  async updateVerificationStatus(userId, verificationType, isVerified) {
    try {
      const query = `
        INSERT INTO user_verifications (user_id, verification_type, is_verified, verified_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, verification_type) DO UPDATE SET
          is_verified = $3,
          verified_at = NOW()
      `;
      
      await database.query(query, [userId, verificationType, isVerified]);
    } catch (error) {
      logger.error('Error updating verification status:', error);
    }
  }

  async logVerificationEvent(userId, verificationType, status) {
    try {
      const query = `
        INSERT INTO verification_events (user_id, verification_type, status, created_at)
        VALUES ($1, $2, $3, NOW())
      `;
      
      await database.query(query, [userId, verificationType, status]);
    } catch (error) {
      logger.error('Error logging verification event:', error);
    }
  }
}

module.exports = new IdentityVerifier();

