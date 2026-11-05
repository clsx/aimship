-- 1. TARGET AND BASIS
-- Synthetic main database, PostgreSQL 15. PRD REQ-001/REQ-002;
-- tech-design sections 5 and 9. Existing member(tenant_id uuid, id uuid)
-- has composite PRIMARY KEY (tenant_id,id). No actual database inspected/run.
-- Prepared script is not execution permission. Use an isolated authorized target.

-- 2. PRECHECKS (operator must stop on unexpected output BEFORE the change block)
SELECT current_database(), current_setting('server_version');
-- Expect the authorized main target and PostgreSQL 15.x.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'member'::regclass AND contype = 'p';
-- Expect PRIMARY KEY (tenant_id, id), and both columns uuid/not null:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = current_schema() AND table_name = 'member'
  AND column_name IN ('tenant_id', 'id');
SELECT to_regclass('hold') AS hold, to_regclass('notice_outbox') AS outbox;
-- Expect both NULL. Names must resolve in the intended current_schema/search_path.
-- These SELECTs do NOT automatically abort a SQL client. Inspect, then proceed.

-- 3. CHANGES (configure the client to stop on any error; transactional DDL)
BEGIN;
CREATE TABLE hold (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  member_id uuid NOT NULL,
  client_key uuid NOT NULL,
  item_code varchar(32) NOT NULL CHECK (item_code ~ '^[A-Za-z0-9-]{1,32}$'),
  state varchar(8) NOT NULL DEFAULT 'ACTIVE' CHECK (state = 'ACTIVE'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, client_key),
  FOREIGN KEY (tenant_id, member_id) REFERENCES member(tenant_id, id)
);
CREATE TABLE notice_outbox (
  id uuid PRIMARY KEY,
  hold_id uuid NOT NULL UNIQUE REFERENCES hold(id),
  status varchar(7) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX notice_outbox_pending ON notice_outbox(created_at, id)
  WHERE status = 'PENDING';
COMMIT;
-- Do not deploy new code before schema checks; enable dispatcher only after
-- consumer dedup/ack semantics are available. No cache or configuration DML here.

-- 4. RESULT CHECKS
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = current_schema() AND tablename IN ('hold','notice_outbox');
-- Expect each PK, hold unique tenant/client key, outbox unique hold_id and
-- notice_outbox_pending partial ordered index.
SELECT conrelid::regclass, contype, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid IN ('hold'::regclass,'notice_outbox'::regclass);
-- Check the composite member FK, outbox hold FK, CHECK and uniqueness definitions.
SELECT (SELECT count(*) FROM hold) AS holds,
       (SELECT count(*) FROM notice_outbox) AS events;
-- Before code/dispatcher activation both counts must be zero.

-- 5. PARTIAL EXECUTION AND RERUN
-- Failure before COMMIT: ROLLBACK the failed transaction before inspection.
-- Lost connection/unknown COMMIT: reconnect and inspect tables/constraints/indexes.
-- Both absent -> rerun prechecks then change block; both fully match -> do NOT
-- repeat CREATE statements. Partial/mismatched schema -> stop and reconcile the
-- exact executed object; no blanket IF NOT EXISTS hiding divergent definitions.

-- 6. ROLLBACK OR IRREVERSIBLE EFFECTS
-- Before any app writes, a separately reviewed rollback may drop the two empty
-- tables in child-first order (notice_outbox, then hold), after verifying counts
-- and stopping writers. It is intentionally not executable in this forward file.
-- Once populated, dropping tables destroys holds/pending notices. Stop dispatcher
-- and writers, preserve a verified backup, and obtain a data-specific recovery
-- decision. Code rollback should retain tables/events; no fictitious lossless undo.
