-- Create/augment organization_members table with roles, invite/join columns
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Add columns if missing (guarded for existing tables)
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member'));

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS invited_at timestamptz;

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- Enable RLS if not already
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if conflict (optional—comment if you want to keep old)
-- DROP POLICY IF EXISTS "Users can view own memberships" ON organization_members;
-- DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;

-- Users can view their own memberships
CREATE POLICY IF NOT EXISTS "Users can view own memberships" ON organization_members FOR SELECT
USING (user_id = auth.uid());

-- Admins can fully manage members in their org
CREATE POLICY IF NOT EXISTS "Admins can manage members" ON organization_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Invited users can accept and join (email-based)
CREATE POLICY IF NOT EXISTS "Invited users can join" ON organization_members FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM org_invites i
    WHERE i.org_id = organization_members.org_id
      AND i.email = auth.jwt()->>'email'
      AND i.status = 'pending'
      AND i.expires_at > now()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_invites i
    WHERE i.org_id = organization_members.org_id
      AND i.email = auth.jwt()->>'email'
      AND i.status = 'pending'
      AND i.expires_at > now()
  )
);