import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

const SYSTEM_PROMPT = `You are an AI construction site log analyst. Given raw field notes from a construction site, extract a structured summary.

You MUST respond with ONLY valid JSON (no markdown, no backticks, no explanation) in this exact format:
{
  "progress": "What work was completed or advanced today.",
  "blockers": "Any delays, equipment failures, material shortages. If none, say 'No blockers reported.'",
  "next_steps": "Recommended actions for the next working day."
}`;

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace("Bearer ", "");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: corsHeaders });
        }

        const { project_id, raw_text } = await req.json();

        if (!project_id || !raw_text?.trim()) {
            return new Response(JSON.stringify({ error: "project_id and raw_text are required" }), { status: 400, headers: corsHeaders });
        }

        const geminiResponse = await fetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n--- RAW SITE LOG ---\n${raw_text}` }] }
                ],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error("Gemini API error:", errText);
            return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 502, headers: corsHeaders });
        }

        const geminiData = await geminiResponse.json();
        const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            return new Response(JSON.stringify({ error: "AI returned empty response" }), { status: 502, headers: corsHeaders });
        }

        const cleanText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let aiSummary;
        try {
            aiSummary = JSON.parse(cleanText);
        } catch {
            return new Response(JSON.stringify({ error: "AI returned invalid format", raw_ai: cleanText }), { status: 502, headers: corsHeaders });
        }

        if (!aiSummary.progress || !aiSummary.blockers || !aiSummary.next_steps) {
            return new Response(JSON.stringify({ error: "AI response missing required fields" }), { status: 502, headers: corsHeaders });
        }

        const { data: logRecord, error: insertError } = await supabase
            .from("site_logs")
            .insert({
                project_id,
                submitted_by: user.id,
                raw_text: raw_text.trim(),
                ai_summary: aiSummary,
                log_date: new Date().toISOString().split("T")[0],
            })
            .select()
            .single();

        if (insertError) {
            console.error("DB insert error:", insertError);
            return new Response(JSON.stringify({ error: "Failed to save log", detail: insertError.message }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true, log: logRecord, ai_summary: aiSummary }), { headers: corsHeaders });
    } catch (err) {
        console.error("Unhandled error:", err);
        return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), { status: 500, headers: corsHeaders });
    }
});
