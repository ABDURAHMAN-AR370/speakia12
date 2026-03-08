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
    let whitelistRow: any = null;
    const cleaned = identifier.replace(/\s+/g, "").replace(/^\+/, "");

    if (identifier.includes("@")) {
      const { data } = await supabase.from("whitelist").select("*").eq("email", identifier.toLowerCase()).maybeSingle();
      if (data) { email = data.email; whitelistRow = data; }
    } else {
      const generatedEmail = `${cleaned}@qurba.app`;
      const { data } = await supabase.from("whitelist").select("*").eq("email", generatedEmail).maybeSingle();
      if (data) {
        email = data.email; whitelistRow = data;
      } else {
        const { data: data2 } = await supabase.from("whitelist").select("*").eq("phone_number", cleaned).maybeSingle();
        if (data2) { email = data2.email; whitelistRow = data2; }
      }
    }

    if (!email || !whitelistRow) {
      return new Response(JSON.stringify({ error: "not_whitelisted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchNumber = whitelistRow.batch_number || 1;
    const fullName = whitelistRow.full_name || "Student";
    const whatsappNumber = whitelistRow.phone_number || (email.endsWith("@qurba.app") ? email.replace("@qurba.app", "") : "");
    const gender = whitelistRow.gender || "not_specified";
    const place = whitelistRow.place || "";
    const referredBy = whitelistRow.referred_by || null;
    const signupSource = whitelistRow.signup_source || null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        // User exists — sync profile data from whitelist on every sign-in
        // Find the user's auth record to get user_id
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        const existingUser = authUsers?.find((u: any) => u.email === email);
        
        if (existingUser) {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (existingProfile) {
            // Update profile with whitelist data (whitelist is source of truth for admin-set fields)
            const updates: any = {
              batch_number: batchNumber,
            };
            // Only update name if whitelist has a name (don't overwrite with "Student" if profile already has a real name)
            if (whitelistRow.full_name) updates.full_name = whitelistRow.full_name;
            if (whitelistRow.place) updates.place = whitelistRow.place;
            if (whitelistRow.gender) updates.gender = whitelistRow.gender;
            if (whitelistRow.phone_number) updates.whatsapp_number = whitelistRow.phone_number;
            if (whitelistRow.referred_by) updates.referred_by = whitelistRow.referred_by;
            if (whitelistRow.signup_source) updates.signup_source = whitelistRow.signup_source;

            await supabase.from("profiles").update(updates).eq("user_id", existingUser.id);
          } else {
            // Profile doesn't exist yet — create it
            await supabase.from("profiles").insert({
              user_id: existingUser.id,
              email: email,
              full_name: fullName,
              gender: gender,
              place: place,
              whatsapp_number: whatsappNumber,
              batch_number: batchNumber,
              referred_by: referredBy,
              signup_source: signupSource,
            });
          }
        }

        return new Response(JSON.stringify({ action: "sign_in", email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New user created - create profile using whitelist data
    await supabase.from("profiles").insert({
      user_id: authData.user.id,
      email: email,
      full_name: fullName,
      gender: gender,
      place: place,
      whatsapp_number: whatsappNumber,
      batch_number: batchNumber,
      referred_by: referredBy,
      signup_source: signupSource,
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
