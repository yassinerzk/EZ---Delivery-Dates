-- Database Schema Update for Delivery Rules
-- Add is_default and updated_at columns

-- Add is_default column (boolean, default FALSE)
ALTER TABLE delivery_rules 
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- Add updated_at column (timestamp, default NOW())
ALTER TABLE delivery_rules 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_rules_updated_at 
    BEFORE UPDATE ON delivery_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to ensure only one default rule per shop
CREATE OR REPLACE FUNCTION ensure_single_default_per_shop()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated row is being set as default
    IF NEW.is_default = TRUE THEN
        -- Unset any existing default rules for this shop
        UPDATE delivery_rules 
        SET is_default = FALSE 
        WHERE shop = NEW.shop 
          AND id != NEW.id 
          AND is_default = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_default_delivery_rule 
    BEFORE INSERT OR UPDATE ON delivery_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION ensure_single_default_per_shop();

-- Update existing rows to have updated_at = created_at
UPDATE delivery_rules 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Comments:
-- 1. Run this SQL script in your Supabase SQL editor
-- 2. The is_default column ensures only one default rule per shop
-- 3. The updated_at column tracks when rules are modified
-- 4. Triggers automatically maintain data integrity