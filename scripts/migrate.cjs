require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  console.log('🚀 Connected to NeonDB successfully.');

  try {
    await client.query('BEGIN');
    console.log('📦 Applying DDL Migrations...');

    // 1. Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Custom Enum Types
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('ADMIN', 'SPV', 'TECHNICIAN');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_type') THEN
          CREATE TYPE form_type AS ENUM ('STANDARD', 'CUSTOM');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
          CREATE TYPE submission_status AS ENUM ('DRAFT', 'SUBMITTED', 'REVISED', 'FLAGGED_ABNORMAL', 'ARCHIVED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'housekeeping_status') THEN
          CREATE TYPE housekeeping_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
        END IF;
      END $$;
    `);

    // 3. Trigger Function for Updated Timestamps
    await client.query(`
      CREATE OR REPLACE FUNCTION update_timestamp_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        employee_code VARCHAR(50) UNIQUE,
        role user_role NOT NULL DEFAULT 'TECHNICIAN',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);
      CREATE INDEX IF NOT EXISTS idx_users_created_by ON users (created_by);
    `);

    // 5. Locations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        floor VARCHAR(20),
        building VARCHAR(100) NOT NULL DEFAULT 'Main Building',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_locations_code ON locations (code);
    `);

    // 6. Form Templates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS form_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(80) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        form_type form_type NOT NULL DEFAULT 'CUSTOM',
        version INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        schema_definition JSONB NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_form_template_code_version UNIQUE (code, version)
      );
      CREATE INDEX IF NOT EXISTS idx_form_templates_code ON form_templates (code);
      CREATE INDEX IF NOT EXISTS idx_form_templates_type_active ON form_templates (form_type, is_active);
      CREATE INDEX IF NOT EXISTS idx_form_templates_schema_gin ON form_templates USING GIN (schema_definition);
    `);

    // 7. Assets Table (with Barcode)
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barcode VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        category VARCHAR(100) NOT NULL,
        default_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets (barcode);
      CREATE INDEX IF NOT EXISTS idx_assets_location ON assets (location_id);
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (category);
    `);

    // 8. Form Submissions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
        template_version INTEGER NOT NULL,
        technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        barcode_scanned VARCHAR(100),
        status submission_status NOT NULL DEFAULT 'SUBMITTED',
        has_abnormal_reading BOOLEAN NOT NULL DEFAULT FALSE,
        technician_notes TEXT,
        submission_data JSONB NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_submissions_loc_date ON form_submissions (location_id, submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_submissions_date_status ON form_submissions (submitted_at DESC, status);
      CREATE INDEX IF NOT EXISTS idx_submissions_tech_date ON form_submissions (technician_id, submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_submissions_barcode ON form_submissions (barcode_scanned) WHERE barcode_scanned IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_submissions_data_gin ON form_submissions USING GIN (submission_data jsonb_path_ops);
    `);

    // 9. Form Submission Audits Table (Technician Edits & Revision History)
    await client.query(`
      CREATE TABLE IF NOT EXISTS form_submission_audits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
        modified_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        previous_data JSONB NOT NULL,
        new_data JSONB NOT NULL,
        change_reason TEXT,
        modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_submission_audits_sub_date ON form_submission_audits (submission_id, modified_at DESC);
    `);

    // 10. Housekeeping Logs Table (End of Month Records)
    await client.query(`
      CREATE TABLE IF NOT EXISTS housekeeping_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_year SMALLINT NOT NULL,
        period_month SMALLINT NOT NULL,
        range_start TIMESTAMPTZ NOT NULL,
        range_end TIMESTAMPTZ NOT NULL,
        total_records INTEGER NOT NULL DEFAULT 0,
        export_format VARCHAR(20) NOT NULL DEFAULT 'EXCEL+PDF',
        archive_file_path TEXT,
        status housekeeping_status NOT NULL DEFAULT 'PENDING',
        executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        CONSTRAINT uq_housekeeping_period UNIQUE (period_year, period_month)
      );
      CREATE INDEX IF NOT EXISTS idx_housekeeping_period ON housekeeping_logs (period_year, period_month);
    `);

    // 11. Triggers Setup
    await client.query(`
      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

      DROP TRIGGER IF EXISTS trg_form_templates_updated_at ON form_templates;
      CREATE TRIGGER trg_form_templates_updated_at
      BEFORE UPDATE ON form_templates
      FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

      DROP TRIGGER IF EXISTS trg_form_submissions_updated_at ON form_submissions;
      CREATE TRIGGER trg_form_submissions_updated_at
      BEFORE UPDATE ON form_submissions
      FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    `);

    await client.query('COMMIT');
    console.log('✅ All tables, enums, triggers, and indexes migrated successfully to NeonDB.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
