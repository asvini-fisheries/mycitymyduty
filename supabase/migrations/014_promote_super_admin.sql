-- Promote all admin users to super_admin (dev). Does not change existing super_admin rows.
UPDATE user_master
SET role = 'super_admin'
WHERE role = 'admin';

-- Return promoted rows for verification
SELECT id, email, full_name, role
FROM user_master
WHERE role = 'super_admin'
ORDER BY created_at;