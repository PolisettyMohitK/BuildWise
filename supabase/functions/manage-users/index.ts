import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
            },
        });
    }

    const corsHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
        }

        const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: callerProfile } = await supabase
            .from("profiles")
            .select("role, organization_id")
            .eq("id", user.id)
            .single();

        if (callerProfile?.role !== "admin") {
            return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
        }

        const { action, ...payload } = await req.json();

        if (action === "create_user") {
            const { email, password, full_name, role } = payload;
            if (!email || !password || !full_name || !role) {
                return new Response(JSON.stringify({ error: "email, password, full_name, and role are required" }), { status: 400, headers: corsHeaders });
            }
            if (!['admin', 'worker', 'client'].includes(role)) {
                return new Response(JSON.stringify({ error: "role must be admin, worker, or client" }), { status: 400, headers: corsHeaders });
            }

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role },
            });

            if (createError) {
                return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
            }

            await new Promise(r => setTimeout(r, 500));

            await supabase
                .from("profiles")
                .update({
                    full_name,
                    role,
                    organization_id: callerProfile.organization_id,
                })
                .eq("id", newUser.user!.id);

            return new Response(JSON.stringify({
                success: true,
                user_id: newUser.user!.id,
                email,
                role,
                full_name,
            }), { headers: corsHeaders });
        }

        if (action === "update_role") {
            const { user_id, new_role } = payload;
            if (!user_id || !new_role) {
                return new Response(JSON.stringify({ error: "user_id and new_role required" }), { status: 400, headers: corsHeaders });
            }
            if (!['admin', 'worker', 'client'].includes(new_role)) {
                return new Response(JSON.stringify({ error: "role must be admin, worker, or client" }), { status: 400, headers: corsHeaders });
            }

            const { data: targetProfile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("id", user_id)
                .single();

            if (targetProfile?.organization_id !== callerProfile.organization_id) {
                return new Response(JSON.stringify({ error: "User not in your organization" }), { status: 403, headers: corsHeaders });
            }

            await supabase
                .from("profiles")
                .update({ role: new_role })
                .eq("id", user_id);

            return new Response(JSON.stringify({ success: true, user_id, new_role }), { headers: corsHeaders });
        }

        if (action === "disable_user") {
            const { user_id } = payload;
            if (!user_id) {
                return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
            }

            if (user_id === user.id) {
                return new Response(JSON.stringify({ error: "Cannot disable yourself" }), { status: 400, headers: corsHeaders });
            }

            const { data: targetProfile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("id", user_id)
                .single();

            if (targetProfile?.organization_id !== callerProfile.organization_id) {
                return new Response(JSON.stringify({ error: "User not in your organization" }), { status: 403, headers: corsHeaders });
            }

            const { error: banError } = await supabase.auth.admin.updateUserById(user_id, {
                ban_duration: "876000h",
            });

            if (banError) {
                return new Response(JSON.stringify({ error: banError.message }), { status: 500, headers: corsHeaders });
            }

            return new Response(JSON.stringify({ success: true, user_id, status: "disabled" }), { headers: corsHeaders });
        }

        if (action === "list_users") {
            const { data: teamMembers } = await supabase
                .from("profiles")
                .select("id, full_name, role, phone, avatar_url, created_at")
                .eq("organization_id", callerProfile.organization_id)
                .order("created_at");

            const enriched = [];
            for (const member of (teamMembers || [])) {
                const { data: authData } = await supabase.auth.admin.getUserById(member.id);
                enriched.push({
                    ...member,
                    email: authData?.user?.email || 'unknown',
                    banned: authData?.user?.banned_until ? true : false,
                });
            }

            return new Response(JSON.stringify({ users: enriched }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });

    } catch (err) {
        console.error("Unhandled error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
});
