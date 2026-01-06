-- Update default primary_color for teams to purple
ALTER TABLE public.teams ALTER COLUMN primary_color SET DEFAULT '#9146FF';

-- Update existing teams with null or red default to purple
UPDATE public.teams SET primary_color = '#9146FF' WHERE primary_color IS NULL OR primary_color = '#DC2626';