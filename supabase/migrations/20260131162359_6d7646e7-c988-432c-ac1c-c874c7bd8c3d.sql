-- Add admin email to whitelist (so they can register)
INSERT INTO public.whitelist (email) VALUES ('3370abdurahman@gmail.com');

-- Create a function to set admin role for a specific email after registration
CREATE OR REPLACE FUNCTION public.set_admin_for_email()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT := '3370abdurahman@gmail.com';
  user_email TEXT;
BEGIN
  -- Get the email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- If this is the admin email, upgrade to admin role
  IF user_email = admin_email THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-upgrade admin after profile creation
CREATE TRIGGER set_admin_role_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_for_email();