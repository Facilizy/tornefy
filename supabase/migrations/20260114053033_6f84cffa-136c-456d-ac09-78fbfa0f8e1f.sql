-- Add WhatsApp link to trainings and training_templates
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS whatsapp_link text;

ALTER TABLE public.training_templates
ADD COLUMN IF NOT EXISTS whatsapp_link text;