import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, new_password } = await req.json();

    if (!phone_number || !new_password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find email from profiles by phone number
    const cleaned = phone_number.replace(/\s+/g, "").replace(/^\+/, "");
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email")
      .or(`whatsapp_number.eq.${cleaned},whatsapp_number.eq.+${cleaned},whatsapp_number.eq.${phone_number}`)
      .maybeSingle();

    if (profileError || !profile?.email) {
      return new Response(JSON.stringify({ error: "Account not found" }), { status: 404, headers: corsHeaders });
    }

    const email = profile.email;

    // Check password_reset_enabled flag in whitelist
    const { data: whitelistEntry } = await adminClient
      .from("whitelist")
      .select("password_reset_enabled, phone_number, email")
      .or(`email.eq.${email},phone_number.eq.${cleaned},phone_number.eq.${phone_number}`)
      .maybeSingle();

    if (!whitelistEntry?.password_reset_enabled) {
      return new Response(JSON.stringify({ error: "Password reset not enabled for this account" }), { status: 403, headers: corsHeaders });
    }

    // Find user in auth by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const authUser = users.find((u) => u.email === email);
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Auth user not found" }), { status: 404, headers: corsHeaders });
    }

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: new_password,
    });

    if (updateError) throw updateError;

    // Disable the reset flag
    await adminClient.from("whitelist").update({ password_reset_enabled: false }).eq("email", email);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
