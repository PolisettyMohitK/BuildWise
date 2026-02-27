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

        const { task_id } = await req.json();

        if (!task_id) {
            return new Response(JSON.stringify({ error: "task_id is required" }), { status: 400, headers: corsHeaders });
        }

        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .select("id, name, description, phase_id")
            .eq("id", task_id)
            .single();

        if (taskError || !task) {
            return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: corsHeaders });
        }

        const { data: materials } = await supabase
            .from("materials")
            .select("item_code, description, unit, base_rate, category")
            .order("category");

        const materialsContext = (materials || []).map(
            (m: any) => `${m.item_code}: ${m.description} | Unit: ${m.unit} | Rate: Rs.${m.base_rate}/per ${m.unit} | Category: ${m.category}`
        ).join("\n");

        const systemPrompt = `You are an expert construction cost estimator. Given a task description and a DSR material reference, estimate the cost breakdown.

You MUST respond with ONLY valid JSON (no markdown, no backticks) in this format:
{
  "total_estimated_cost": <number>,
  "currency": "INR",
  "line_items": [
    {
      "material_code": "<DSR item code>",
      "material_description": "<description>",
      "quantity": <number>,
      "unit": "<unit>",
      "rate": <number>,
      "amount": <quantity * rate>
    }
  ],
  "labor_cost": <number>,
  "overhead_percentage": <10-15>,
  "notes": "<assumptions>"
}`;

        const userPrompt = `--- TASK ---\nTitle: ${task.name}\nDescription: ${task.description || "No description."}\n\n--- DSR MATERIALS ---\n${materialsContext}`;

        const geminiResponse = await fetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
                ],
                generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
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
        let costBreakdown;
        try {
            costBreakdown = JSON.parse(cleanText);
        } catch {
            return new Response(JSON.stringify({ error: "AI returned invalid format" }), { status: 502, headers: corsHeaders });
        }

        const { data: updatedTask, error: updateError } = await supabase
            .from("tasks")
            .update({
                estimated_cost: costBreakdown.total_estimated_cost,
                cost_breakdown: costBreakdown,
            })
            .eq("id", task_id)
            .select()
            .single();

        if (updateError) {
            return new Response(JSON.stringify({ error: "Failed to save estimate", detail: updateError.message }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true, task: updatedTask, cost_breakdown: costBreakdown }), { headers: corsHeaders });
    } catch (err) {
        console.error("Unhandled error:", err);
        return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), { status: 500, headers: corsHeaders });
    }
});
