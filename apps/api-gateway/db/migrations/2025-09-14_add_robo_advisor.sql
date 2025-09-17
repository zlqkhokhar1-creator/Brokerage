-- Migration to add support for a Robo-Advisory Feature

-- Create a table to store the questions for the risk assessment questionnaire
CREATE TABLE IF NOT EXISTS risk_assessment_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_order INT NOT NULL UNIQUE,
    -- options could be a JSONB array like: [{"text": "Option 1", "score": 1}, ...]
    options JSONB NOT NULL 
);

-- Create a table to store a user's answers to the questionnaire
CREATE TABLE IF NOT EXISTS user_risk_assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES risk_assessment_questions(id),
    selected_option_score INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for pre-defined model portfolios
CREATE TABLE IF NOT EXISTS model_portfolios (
    id SERIAL PRIMARY KEY,
    risk_level VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'Conservative', 'Moderate', 'Aggressive'
    description TEXT,
    -- target_allocation is a JSONB array like: [{"symbol": "VTI", "percentage": 0.6}, ...]
    target_allocation JSONB NOT NULL
);

-- Create a table to manage a user's robo-advisory account
CREATE TABLE IF NOT EXISTS user_robo_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    model_portfolio_id INT NOT NULL REFERENCES model_portfolios(id),
    risk_score INT,
    is_active BOOLEAN DEFAULT TRUE,
    last_rebalanced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed the questions and model portfolios with some initial data
INSERT INTO risk_assessment_questions (question_order, question_text, options) VALUES
(1, 'What is your investment horizon?', '[{"text": "Less than 2 years", "score": 1}, {"text": "2-5 years", "score": 2}, {"text": "5-10 years", "score": 3}, {"text": "More than 10 years", "score": 4}]'),
(2, 'What is your primary investment goal?', '[{"text": "Capital preservation", "score": 1}, {"text": "Income generation", "score": 2}, {"text": "Balanced growth", "score": 3}, {"text": "Aggressive growth", "score": 4}]');

INSERT INTO model_portfolios (risk_level, description, target_allocation) VALUES
('Conservative', 'Focuses on capital preservation with minimal risk.', '[{"symbol": "BND", "percentage": 0.7}, {"symbol": "VTI", "percentage": 0.3}]'),
('Moderate', 'A balanced approach seeking moderate growth.', '[{"symbol": "BND", "percentage": 0.4}, {"symbol": "VTI", "percentage": 0.6}]'),
('Aggressive', 'Maximizes potential returns by taking on higher risk.', '[{"symbol": "BND", "percentage": 0.1}, {"symbol": "VTI", "percentage": 0.9}]');

CREATE INDEX IF NOT EXISTS idx_user_robo_accounts_user_id ON user_robo_accounts(user_id);
