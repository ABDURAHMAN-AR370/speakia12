import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return new Response(JSON.stringify({ error: "Identifier and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve identifier to email
    let email: string | null = null;
    const cleaned = identifier.replace(/\s+/g, "").replace(/^\+/, "");

    if (identifier.includes("@")) {
      // It's already an email - check whitelist
      const { data } = await supabase.from("whitelist").select("email").eq("email", identifier.toLowerCase()).maybeSingle();
      email = data?.email || null;
    } else {
      // Phone number - try generated email format
      const generatedEmail = `${cleaned}@qurba.app`;
      const { data } = await supabase.from("whitelist").select("email").eq("email", generatedEmail).maybeSingle();
      if (data) {
        email = data.email;
      } else {
        // Try phone_number column
        const { data: data2 } = await supabase.from("whitelist").select("email").eq("phone_number", cleaned).maybeSingle();
        email = data2?.email || null;
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "not_whitelisted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if auth user already exists
    const { data: existingUserData } = await supabase.auth.admin.getUserByEmail(email);
    const existingUser = existingUserData?.user;

    if (existingUser) {
      // User exists - just return so client can sign in normally
      return new Response(JSON.stringify({ action: "sign_in", email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User doesn't exist - auto-create with provided password (should be default 123456)
    const { data: whitelistData } = await supabase.from("whitelist").select("batch_number").eq("email", email).maybeSingle();
    const batchNumber = whitelistData?.batch_number || 1;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    const whatsappNumber = email.endsWith("@qurba.app") ? email.replace("@qurba.app", "") : "";
    await supabase.from("profiles").insert({
      user_id: authData.user.id,
      email: email,
      full_name: whatsappNumber || email.split("@")[0],
      gender: "not_specified",
      place: "",
      whatsapp_number: whatsappNumber,
      batch_number: batchNumber,
    });

    return new Response(JSON.stringify({ action: "created", email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
