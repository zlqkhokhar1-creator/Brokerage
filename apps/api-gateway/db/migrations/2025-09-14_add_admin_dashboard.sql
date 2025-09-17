-- Migration to add support for an internal admin dashboard

-- Create a table for different admin roles
CREATE TABLE IF NOT EXISTS admin_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL, -- e.g., { "can_view_users": true, "can_edit_users": false, "can_view_trades": true }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a column to the users table to assign an admin role
ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS admin_role_id INTEGER REFERENCES admin_roles(id);

-- Insert a default 'super_admin' role with all permissions
INSERT INTO admin_roles (role_name, permissions) VALUES
    ('super_admin', '{
        "can_view_users": true,
        "can_edit_users": true,
        "can_delete_users": true,
        "can_view_trades": true,
        "can_cancel_trades": true,
        "can_view_system_health": true
    }')
ON CONFLICT (role_name) DO NOTHING;
