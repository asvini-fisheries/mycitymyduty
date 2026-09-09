-- Quantity on projects must be numeric (convert leftover text values).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'quantity'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE projects
      ALTER COLUMN quantity TYPE DECIMAL(15, 3)
      USING CASE
        WHEN quantity ~ '^[0-9]+(\.[0-9]+)?$' THEN quantity::DECIMAL(15, 3)
        ELSE NULL
      END;
  END IF;
END $$;
