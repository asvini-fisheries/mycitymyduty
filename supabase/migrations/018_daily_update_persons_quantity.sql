-- Daily activity updates: persons attended, quantity, and a short description
-- (e.g. Tree Plantation quantity = no. of trees, description = "Sapling Planted").

ALTER TABLE daily_activity_updates
  ADD COLUMN IF NOT EXISTS persons_attended INTEGER,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(15, 3),
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE daily_activity_updates
  DROP CONSTRAINT IF EXISTS daily_activity_updates_persons_attended_check;

ALTER TABLE daily_activity_updates
  ADD CONSTRAINT daily_activity_updates_persons_attended_check
  CHECK (persons_attended IS NULL OR persons_attended >= 0);

-- Tree plantation quantity is recorded as number of trees.
UPDATE activities
SET unit = 'No. of trees'
WHERE name ILIKE 'Tree Plantation'
  AND (unit IS NULL OR unit IN ('nos', 'Nos', 'no', 'No.'));
