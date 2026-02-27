import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

        // 1. Verify user via Auth API
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "apikey": SUPABASE_ANON_KEY,
            },
        });

        if (!authRes.ok) {
            const err = await authRes.text();
            return new Response(JSON.stringify({ error: "Invalid token", detail: err }), { status: 401, headers: corsHeaders });
        }
        const user = await authRes.json();

        // 2. Check admin role via REST API
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                "apikey": SUPABASE_SERVICE_KEY,
                "Content-Profile": "public",
            },
        });

        const profiles = await profileRes.json();
        if (!profiles || !profiles.length || profiles[0].role !== "admin") {
            return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
        }

        // 3. Parse body
        const bodyText = await req.text();
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
        }

        const { project_id, description, location, duration_weeks } = body;
        if (!project_id || !description) {
            return new Response(JSON.stringify({ error: "project_id and description required" }), { status: 400, headers: corsHeaders });
        }

        // 4. Call Gemini
        const durationText = duration_weeks ? `${duration_weeks} weeks` : "reasonable duration";
        const locText = location || "unspecified";

        const prompt = `You are an expert construction project planner. Generate a realistic construction schedule.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "phases": [
    {
      "name": "Phase name",
      "description": "Brief description",
      "order_index": 1,
      "tasks": [
        {
          "name": "Task name",
          "description": "Task description",
          "duration_days": 7,
          "dependencies": [],
          "priority": 3
        }
      ]
    }
  ]
}

Rules:
- 4-7 phases covering the full construction lifecycle
- Each phase: 3-8 tasks
- Dependencies = global 0-based task array index across ALL phases (e.g. [0, 1])
- Approximate ${durationText} total
- Location: ${locText}

Project: ${description}`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
                }),
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return new Response(JSON.stringify({ error: "AI service error", detail: errText.substring(0, 300) }), { status: 502, headers: corsHeaders });
        }

        const geminiData = await geminiRes.json();
        const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) {
            return new Response(JSON.stringify({ error: "AI empty response" }), { status: 502, headers: corsHeaders });
        }

        // 5. Parse output
        const cleanText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let schedule;
        try {
            schedule = JSON.parse(cleanText);
        } catch {
            return new Response(JSON.stringify({ error: "AI invalid JSON", raw: cleanText.substring(0, 300) }), { status: 502, headers: corsHeaders });
        }

        if (!schedule.phases?.length) {
            return new Response(JSON.stringify({ error: "No phases in AI response" }), { status: 502, headers: corsHeaders });
        }

        // 6. DB inserts via REST API
        const phaseIds: string[] = [];
        const taskIds: string[] = [];
        let globalTaskIndex = 0;
        const taskDepMap: Record<number, string> = {}; // map of global index -> uuid
        const startDate = new Date();
        let currentDate = new Date(startDate);

        // We'll collect all operations to run sequentially
        for (let pIdx = 0; pIdx < schedule.phases.length; pIdx++) {
            const phase = schedule.phases[pIdx];
            const pStart = new Date(currentDate);

            // Create phase
            const phaseRes = await fetch(`${SUPABASE_URL}/rest/v1/phases`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                body: JSON.stringify({
                    project_id,
                    name: phase.name,
                    description: phase.description || "",
                    order_index: phase.order_index || (pIdx + 1),
                    start_date: pStart.toISOString().split("T")[0],
                })
            });

            if (!phaseRes.ok) {
                const err = await phaseRes.text();
                return new Response(JSON.stringify({ error: "Phase insert fail", detail: err }), { status: 500, headers: corsHeaders });
            }
            const newPhase = (await phaseRes.json())[0];
            phaseIds.push(newPhase.id);

            // Create tasks for this phase
            const phaseTasks = phase.tasks || [];
            for (let tIdx = 0; tIdx < phaseTasks.length; tIdx++) {
                const task = phaseTasks[tIdx];
                const tStart = new Date(currentDate);
                const tEnd = new Date(currentDate);
                tEnd.setDate(tEnd.getDate() + (task.duration_days || 1));

                // Resolve dependencies
                const mappedDeps = (task.dependencies || [])
                    .map((i: number) => taskDepMap[i])
                    .filter(Boolean);

                const taskRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Content-Type": "application/json",
                        "Prefer": "return=representation",
                    },
                    body: JSON.stringify({
                        phase_id: newPhase.id,
                        project_id,
                        name: task.name,
                        description: task.description || "",
                        status: "todo",
                        priority: task.priority || 3,
                        progress: 0,
                        start_date: tStart.toISOString().split("T")[0],
                        end_date: tEnd.toISOString().split("T")[0],
                        duration_days: task.duration_days || 1,
                        dependencies: mappedDeps,
                    })
                });

                if (!taskRes.ok) {
                    const err = await taskRes.text();
                    return new Response(JSON.stringify({ error: "Task insert fail", detail: err }), { status: 500, headers: corsHeaders });
                }

                const newTask = (await taskRes.json())[0];
                taskIds.push(newTask.id);
                taskDepMap[globalTaskIndex] = newTask.id;
                globalTaskIndex++;
                currentDate = new Date(tEnd);
            }

            // Update Phase end date
            await fetch(`${SUPABASE_URL}/rest/v1/phases?id=eq.${newPhase.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    end_date: currentDate.toISOString().split("T")[0]
                })
            });
        }

        // Update project status
        await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${project_id}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                "apikey": SUPABASE_SERVICE_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                start_date: startDate.toISOString().split("T")[0],
                end_date: currentDate.toISOString().split("T")[0],
                status: "active"
            })
        });

        return new Response(JSON.stringify({
            success: true,
            phases_created: phaseIds.length,
            tasks_created: taskIds.length,
            schedule_start: startDate.toISOString().split("T")[0],
            schedule_end: currentDate.toISOString().split("T")[0],
        }), { headers: corsHeaders });

    } catch (err) {
        console.error("Unhandled:", err);
        return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), { status: 500, headers: corsHeaders });
    }
});
