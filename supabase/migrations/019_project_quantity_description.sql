-- Project quantity and a short description (e.g. Quantity = 100000, Description = Tree plantation).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(15, 3),
  ADD COLUMN IF NOT EXISTS activity_description TEXT;
