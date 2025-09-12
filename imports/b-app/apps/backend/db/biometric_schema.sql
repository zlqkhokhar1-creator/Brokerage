-- Biometric Verification and ID Card Database Schema
-- This schema supports NADRA Pakistan API integration and secure biometric data storage

-- Table for storing biometric verification sessions
CREATE TABLE IF NOT EXISTS biometric_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    step VARCHAR(50) NOT NULL DEFAULT 'fingerprint',
    desktop_connected BOOLEAN DEFAULT FALSE,
    mobile_connected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_biometric_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_session_status CHECK (status IN ('pending', 'connected', 'scanning', 'processing', 'verified', 'failed', 'expired')),
    CONSTRAINT chk_session_step CHECK (step IN ('fingerprint', 'id-card', 'complete'))
);

-- Table for storing biometric verification results
CREATE TABLE IF NOT EXISTS biometric_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id VARCHAR(255),
    verification_id VARCHAR(255) UNIQUE NOT NULL,
    cnic VARCHAR(15) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Encrypted biometric data
    fingerprint_template_encrypted TEXT,
    biometric_quality DECIMAL(5,2) CHECK (biometric_quality >= 0 AND biometric_quality <= 100),
    device_info TEXT,
    
    -- NADRA verified citizen data
    verified_name VARCHAR(255),
    verified_father_name VARCHAR(255),
    verified_date_of_birth DATE,
    verified_address TEXT,
    
    -- Verification metadata
    nadra_response_id VARCHAR(255),
    verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_biometric_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_biometric_verifications_session FOREIGN KEY (session_id) REFERENCES biometric_sessions(session_id) ON DELETE SET NULL
);

-- Table for storing ID card OCR results
CREATE TABLE IF NOT EXISTS id_card_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id VARCHAR(255),
    
    -- Document information
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    
    -- Extracted personal information
    extracted_name VARCHAR(255),
    extracted_father_name VARCHAR(255),
    extracted_date_of_birth DATE,
    extracted_date_of_issue DATE,
    extracted_date_of_expiry DATE,
    extracted_address TEXT,
    extracted_gender VARCHAR(10),
    extracted_nationality VARCHAR(100),
    extracted_place_of_birth VARCHAR(255),
    
    -- OCR metadata
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    raw_ocr_text TEXT,
    image_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the uploaded image
    
    -- Processing information
    ocr_engine VARCHAR(50) DEFAULT 'tesseract',
    processing_time_ms INTEGER,
    
    -- Verification status
    manual_review_required BOOLEAN DEFAULT FALSE,
    verified_by_admin BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_id_card_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_id_card_verifications_session FOREIGN KEY (session_id) REFERENCES biometric_sessions(session_id) ON DELETE SET NULL,
    CONSTRAINT chk_document_type CHECK (document_type IN ('CNIC', 'PASSPORT', 'DRIVING_LICENSE')),
    CONSTRAINT chk_gender CHECK (extracted_gender IN ('M', 'F', 'Male', 'Female', 'Other'))
);

-- Table for storing KYC compliance status (enhanced from existing)
CREATE TABLE IF NOT EXISTS kyc_compliance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Overall KYC status
    overall_status VARCHAR(50) NOT NULL DEFAULT 'INCOMPLETE',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Individual verification statuses
    personal_info_status VARCHAR(50) DEFAULT 'PENDING',
    address_verification_status VARCHAR(50) DEFAULT 'PENDING',
    identity_verification_status VARCHAR(50) DEFAULT 'PENDING',
    biometric_verification_status VARCHAR(50) DEFAULT 'PENDING',
    financial_info_status VARCHAR(50) DEFAULT 'PENDING',
    
    -- Verification IDs for cross-reference
    biometric_verification_id UUID,
    id_card_verification_id UUID,
    
    -- Risk assessment
    risk_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) DEFAULT 'UNKNOWN',
    
    -- Compliance flags
    pep_check_status VARCHAR(50) DEFAULT 'PENDING', -- Politically Exposed Person
    sanctions_check_status VARCHAR(50) DEFAULT 'PENDING',
    aml_check_status VARCHAR(50) DEFAULT 'PENDING', -- Anti-Money Laundering
    
    -- Approval workflow
    requires_manual_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID, -- Admin user ID
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_kyc_compliance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_kyc_biometric_verification FOREIGN KEY (biometric_verification_id) REFERENCES biometric_verifications(id) ON DELETE SET NULL,
    CONSTRAINT fk_kyc_id_card_verification FOREIGN KEY (id_card_verification_id) REFERENCES id_card_verifications(id) ON DELETE SET NULL,
    CONSTRAINT fk_kyc_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_overall_status CHECK (overall_status IN ('INCOMPLETE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT chk_verification_status CHECK (
        personal_info_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') AND
        address_verification_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') AND
        identity_verification_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') AND
        biometric_verification_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') AND
        financial_info_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT chk_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'))
);

-- Table for audit trail of verification actions
CREATE TABLE IF NOT EXISTS verification_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'biometric', 'id_card', 'kyc_status'
    entity_id UUID,
    
    -- Action details
    old_values JSONB,
    new_values JSONB,
    action_reason TEXT,
    
    -- Actor information
    performed_by UUID, -- User ID who performed the action (admin, system, etc.)
    performed_by_type VARCHAR(20) DEFAULT 'USER', -- 'USER', 'ADMIN', 'SYSTEM'
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_log_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('biometric_session', 'biometric_verification', 'id_card_verification', 'kyc_status')),
    CONSTRAINT chk_performed_by_type CHECK (performed_by_type IN ('USER', 'ADMIN', 'SYSTEM', 'API'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_biometric_sessions_user_id ON biometric_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_sessions_session_id ON biometric_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_biometric_sessions_expires_at ON biometric_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_biometric_verifications_user_id ON biometric_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_verifications_cnic ON biometric_verifications(cnic);
CREATE INDEX IF NOT EXISTS idx_biometric_verifications_verification_id ON biometric_verifications(verification_id);
CREATE INDEX IF NOT EXISTS idx_biometric_verifications_timestamp ON biometric_verifications(verification_timestamp);

CREATE INDEX IF NOT EXISTS idx_id_card_verifications_user_id ON id_card_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_id_card_verifications_document_number ON id_card_verifications(document_number);
CREATE INDEX IF NOT EXISTS idx_id_card_verifications_document_type ON id_card_verifications(document_type);
CREATE INDEX IF NOT EXISTS idx_id_card_verifications_image_hash ON id_card_verifications(image_hash);

CREATE INDEX IF NOT EXISTS idx_kyc_compliance_user_id ON kyc_compliance_status(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_compliance_overall_status ON kyc_compliance_status(overall_status);
CREATE INDEX IF NOT EXISTS idx_kyc_compliance_risk_level ON kyc_compliance_status(risk_level);
CREATE INDEX IF NOT EXISTS idx_kyc_compliance_manual_review ON kyc_compliance_status(requires_manual_review);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON verification_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON verification_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON verification_audit_log(performed_by);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_biometric_sessions_updated_at BEFORE UPDATE ON biometric_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biometric_verifications_updated_at BEFORE UPDATE ON biometric_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_id_card_verifications_updated_at BEFORE UPDATE ON id_card_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_compliance_status_updated_at BEFORE UPDATE ON kyc_compliance_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update KYC completion percentage
CREATE OR REPLACE FUNCTION calculate_kyc_completion_percentage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_count INTEGER := 0;
    total_steps INTEGER := 5; -- personal_info, address, identity, biometric, financial
    kyc_record RECORD;
BEGIN
    SELECT * INTO kyc_record FROM kyc_compliance_status WHERE user_id = user_uuid;
    
    IF kyc_record.personal_info_status = 'APPROVED' THEN completion_count := completion_count + 1; END IF;
    IF kyc_record.address_verification_status = 'APPROVED' THEN completion_count := completion_count + 1; END IF;
    IF kyc_record.identity_verification_status = 'APPROVED' THEN completion_count := completion_count + 1; END IF;
    IF kyc_record.biometric_verification_status = 'APPROVED' THEN completion_count := completion_count + 1; END IF;
    IF kyc_record.financial_info_status = 'APPROVED' THEN completion_count := completion_count + 1; END IF;
    
    RETURN (completion_count * 100 / total_steps);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update completion percentage when KYC status changes
CREATE OR REPLACE FUNCTION update_kyc_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completion_percentage := calculate_kyc_completion_percentage(NEW.user_id);
    
    -- Update overall status based on completion
    IF NEW.completion_percentage = 100 THEN
        NEW.overall_status := 'APPROVED';
    ELSIF NEW.completion_percentage >= 60 THEN
        NEW.overall_status := 'PENDING_REVIEW';
    ELSE
        NEW.overall_status := 'INCOMPLETE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_completion_trigger BEFORE UPDATE ON kyc_compliance_status FOR EACH ROW EXECUTE FUNCTION update_kyc_completion();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_biometric_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM biometric_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-biometric-sessions', '0 * * * *', 'SELECT cleanup_expired_biometric_sessions();');

-- Views for easier data access
CREATE OR REPLACE VIEW user_verification_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    k.overall_status as kyc_status,
    k.completion_percentage,
    k.biometric_verification_status,
    k.identity_verification_status,
    k.risk_level,
    bv.verified as biometric_verified,
    bv.confidence_score as biometric_confidence,
    bv.cnic,
    iv.document_type as id_document_type,
    iv.document_number as id_document_number,
    iv.confidence_score as id_confidence,
    k.created_at as kyc_created_at,
    k.updated_at as kyc_updated_at
FROM users u
LEFT JOIN kyc_compliance_status k ON u.id = k.user_id
LEFT JOIN biometric_verifications bv ON k.biometric_verification_id = bv.id
LEFT JOIN id_card_verifications iv ON k.id_card_verification_id = iv.id;

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO brokerage_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO brokerage_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO brokerage_app_user;
