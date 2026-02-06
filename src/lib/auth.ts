import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "user";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  gender: string;
  place: string;
  whatsapp_number: string;
  batch_number: number;
  created_at: string;
  updated_at: string;
}

export async function checkEmailWhitelisted(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("whitelist")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  
  if (error) {
    console.error("Error checking whitelist:", error);
    return false;
  }
  
  return !!data;
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
  
  return data?.role as UserRole || null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data as UserProfile;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  gender: string,
  place: string,
  whatsappNumber: string
): Promise<{ success: boolean; error?: string }> {
  // First check if email is whitelisted and get batch number
  const { data: whitelistData, error: whitelistError } = await supabase
    .from("whitelist")
    .select("id, batch_number")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (whitelistError || !whitelistData) {
    return { success: false, error: "Your email is not authorized to register. Please contact the administrator." };
  }

  const batchNumber = whitelistData.batch_number || 1;

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: "Registration failed. Please try again." };
  }

  // Create profile with batch number
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: authData.user.id,
    email: email.toLowerCase(),
    full_name: fullName,
    gender,
    place,
    whatsapp_number: whatsappNumber,
    batch_number: batchNumber,
  });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    return { success: false, error: "Profile creation failed. Please contact support." };
  }

  return { success: true };
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
