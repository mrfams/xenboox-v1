-- Apply documents.status default = 'detected' (deferred from 0009).
-- 0009 originally set this default in the same transaction that added the
-- 'detected' enum value, which Postgres rejects on fresh databases
-- ("unsafe use of new value of enum type"). Splitting it into its own
-- migration keeps fresh-DB (CI, new environments) and existing databases
-- consistent; prod already has the default from its earlier non-txn run.
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'detected';
