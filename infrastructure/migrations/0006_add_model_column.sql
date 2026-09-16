-- Add model column to runs table. One model per run.
alter table runs add column model text;

-- Backfill existing runs with the model used so far.
update runs set model = 'meta-llama/llama-3.3-70b-instruct' where model is null;

-- Make it non-nullable going forward.
alter table runs alter column model set not null;
