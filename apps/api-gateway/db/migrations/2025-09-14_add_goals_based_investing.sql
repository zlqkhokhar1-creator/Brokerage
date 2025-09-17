-- Migration to add support for Goals-Based Investing

-- 1. Create a table to store user-defined financial goals
CREATE TABLE IF NOT EXISTS user_financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    target_date DATE NOT NULL,
    initial_deposit DECIMAL(15, 2) DEFAULT 0.00,
    monthly_contribution DECIMAL(15, 2) NOT NULL,
    -- The suggested model portfolio to achieve this goal
    recommended_portfolio_id INT REFERENCES model_portfolios(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create a table to track the progress of each goal over time
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES user_financial_goals(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL,
    -- The projected value based on the current trajectory
    projected_value DECIMAL(15, 2),
    UNIQUE (goal_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_user_financial_goals_user_id ON user_financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
