-- Steeves & Associates Capstone — Database Schema
-- Run: psql -U postgres -f schema.sql

-- Create database
CREATE DATABASE steeves_capstone;
\c steeves_capstone;

-- Core operational data table
CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    project VARCHAR(255) NOT NULL,
    worked_date DATE NOT NULL,
    task_or_ticket_title VARCHAR(255),
    resource_name VARCHAR(100) NOT NULL,
    billable_hours NUMERIC(6,2) NOT NULL,
    hourly_billing_rate NUMERIC(8,2) NOT NULL,
    extended_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX idx_time_entries_date ON time_entries(worked_date);
CREATE INDEX idx_time_entries_customer ON time_entries(customer_name);
CREATE INDEX idx_time_entries_resource ON time_entries(resource_name);
CREATE INDEX idx_time_entries_project ON time_entries(project);
CREATE INDEX idx_time_entries_date_customer ON time_entries(worked_date, customer_name);

-- Competitive analysis table
CREATE TABLE IF NOT EXISTS competitors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    hourly_rate VARCHAR(50),
    num_employees VARCHAR(50),
    founding_year VARCHAR(10),
    location VARCHAR(100),
    cloud_focus_pct VARCHAR(10),
    description TEXT,
    microsoft_indication BOOLEAN DEFAULT TRUE,
    last_year_revenue VARCHAR(50),
    website VARCHAR(255),
    gold_certified BOOLEAN DEFAULT FALSE,
    fasttrack_partner BOOLEAN DEFAULT FALSE,
    elite_ems_partner BOOLEAN DEFAULT FALSE,
    azure_circle_partner BOOLEAN DEFAULT FALSE,
    leading_system_centre BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- v2: Chat conversation history (foundation for future RAG)
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    data_source VARCHAR(50),    -- 'operational', 'competitive', 'powerbi', 'mixed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_session ON chat_history(session_id, created_at);

-- v2 placeholder: Client health scores (extensibility)
-- CREATE TABLE IF NOT EXISTS client_health_scores ( ... );

-- v2 placeholder: Resource performance scores (extensibility)
-- CREATE TABLE IF NOT EXISTS resource_performance ( ... );
