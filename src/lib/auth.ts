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
  referral_code: string | null;
  referred_by: string | null;
  signup_source: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
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
  phoneNumber: string,
  password: string,
  fullName: string,
  place: string,
  whatsappNumber: string,
  referredBy?: string,
  signupSource?: string
): Promise<{ success: boolean; error?: string }> {
  // Clean the phone number and create a dummy email
  const cleaned = phoneNumber.replace(/\s+/g, "").replace(/^\+/, "");
  const dummyEmail = `${cleaned}@whatsapp.com`;

  // Check if phone number is in whitelist (check by phone_number column OR email legacy)
  const { data: whitelistData, error: whitelistError } = await supabase
    .from("whitelist")
    .select("id, batch_number, phone_number, email")
    .or(`phone_number.eq.${cleaned},phone_number.eq.${phoneNumber},email.eq.${dummyEmail}`)
    .maybeSingle();

  if (whitelistError || !whitelistData) {
    return { success: false, error: "Your phone number is not authorized to register. Please contact the administrator." };
  }

  const batchNumber = whitelistData.batch_number || 1;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dummyEmail,
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

  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: authData.user.id,
    email: dummyEmail,
    full_name: fullName,
    gender: "other",
    place,
    whatsapp_number: cleaned,
    batch_number: batchNumber,
    referred_by: referredBy || null,
    signup_source: signupSource || null,
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
