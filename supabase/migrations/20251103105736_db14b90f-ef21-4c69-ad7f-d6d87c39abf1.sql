-- 1. Remove the problematic check constraint on trainings.status
ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_status_check;

-- 2. Create user_roles table using the existing user_role enum
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Update RLS policy on trainings to use the secure function
DROP POLICY IF EXISTS "Organizers can create trainings" ON public.trainings;
CREATE POLICY "Organizers can create trainings"
ON public.trainings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = organizer_id 
  AND public.has_role(auth.uid(), 'organizer'::user_role)
);

-- 6. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Update handle_new_user function to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Get role from metadata, default to 'player'
  user_role_value := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player'::user_role);
  
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    user_role_value
  );
  
  -- Insert role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_value)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 8. Update notify_new_training function to use user_roles
CREATE OR REPLACE FUNCTION public.notify_new_training()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    ur.user_id,
    'Novo Treino Disponível! 🎮',
    'O treino "' || NEW.name || '" foi criado. Inscreva-se agora!',
    'new_training',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'player'::user_role;
  
  RETURN NEW;
END;
$$;