/**
 * Day 3 初始 schema。
 *
 * PostgreSQL 是长期事实源：issues / tasks / task_steps / artifacts 都可审计和恢复。
 * Redis 在 Day 5 只保存队列、缓存和短期 Blackboard，不能替代这些表。
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  pgm.sql(`
    CREATE TABLE issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      labels JSONB NOT NULL DEFAULT '[]'::jsonb,
      source JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT issues_labels_is_array CHECK (jsonb_typeof(labels) = 'array')
    );

    CREATE TABLE tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
      trace_id TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'queued',
      input JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary TEXT,
      error_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT tasks_status_valid CHECK (status IN (
        'queued', 'planning', 'reproducing', 'searching', 'proposing',
        'awaiting_approval', 'applying', 'validating', 'succeeded',
        'failed', 'needs_review'
      )),
      CONSTRAINT tasks_finished_after_started CHECK (
        finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
      )
    );

    CREATE TABLE task_steps (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'started',
      tool_name TEXT,
      input JSONB NOT NULL DEFAULT '{}'::jsonb,
      output JSONB NOT NULL DEFAULT '{}'::jsonb,
      error JSONB,
      duration_ms INTEGER,
      token_count INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ,
      CONSTRAINT task_steps_sequence_positive CHECK (sequence > 0),
      CONSTRAINT task_steps_status_valid CHECK (status IN ('started', 'succeeded', 'failed', 'skipped')),
      CONSTRAINT task_steps_duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0),
      CONSTRAINT task_steps_tokens_non_negative CHECK (token_count IS NULL OR token_count >= 0),
      CONSTRAINT task_steps_sequence_unique UNIQUE (task_id, sequence)
    );

    CREATE TABLE artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      task_step_id BIGINT REFERENCES task_steps(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      content_type TEXT,
      byte_size BIGINT,
      sha256 CHAR(64),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT artifacts_kind_valid CHECK (kind IN ('log', 'screenshot', 'patch', 'report', 'trace')),
      CONSTRAINT artifacts_byte_size_non_negative CHECK (byte_size IS NULL OR byte_size >= 0),
      CONSTRAINT artifacts_storage_path_unique UNIQUE (storage_path)
    );

    CREATE INDEX tasks_issue_id_created_at_idx ON tasks (issue_id, created_at DESC);
    CREATE INDEX tasks_status_created_at_idx ON tasks (status, created_at DESC);
    CREATE INDEX task_steps_task_id_sequence_idx ON task_steps (task_id, sequence);
    CREATE INDEX artifacts_task_id_created_at_idx ON artifacts (task_id, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS artifacts;
    DROP TABLE IF EXISTS task_steps;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS issues;
  `);
};