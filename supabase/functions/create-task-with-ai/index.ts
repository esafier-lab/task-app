// Setup Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

/* =======================
   Environment Variables
======================= */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

/* =======================
   CORS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* =======================
   Main Function
======================= */
async function createTaskWithAI(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    if (!title) throw new Error("Missing title");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    /* -----------------------
       Auth client (verify user)
    ------------------------ */
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) throw new Error("User not authenticated");

    /* -----------------------
       Admin client (DB access)
    ------------------------ */
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    /* -----------------------
       (Optional) subscription check
       Commented out for testing
    ------------------------ */
    /*
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_level")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_level !== "premium") {
      return new Response(
        JSON.stringify({ error: "AI labeling requires a premium account" }),
        { status: 403, headers: corsHeaders }
      );
    }
    */

    /* -----------------------
       Create task
    ------------------------ */
    const { data: task, error: insertError } = await supabaseAdmin
      .from("tasks")
      .insert({
        title,
        description,
        completed: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    /* -----------------------
       OpenAI label and priority generation
    ------------------------ */
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `Task title: "${title}"
Description: "${description ?? ""}"

Analyze this task and provide:
1. A label from this list: work, personal, priority, shopping, home
2. A priority level: 1 (low), 2 (medium), or 3 (high)

Consider urgency, importance, deadlines, and keywords like "urgent", "asap", "important", "deadline", "critical" for priority.

Return your response in this exact format:
LABEL: [label word]
PRIORITY: [1, 2, or 3]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 20,
    });

    const response = completion.choices[0].message.content || "";
    
    // Parse label
    const labelMatch = response.match(/LABEL:\s*(\w+)/i);
    const rawLabel = labelMatch?.[1]?.toLowerCase().trim();
    const VALID_LABELS = ["work", "personal", "priority", "shopping", "home"];
    const label = rawLabel && VALID_LABELS.includes(rawLabel) ? rawLabel : null;

    // Parse priority
    const priorityMatch = response.match(/PRIORITY:\s*([1-3])/i);
    const priorityValue = priorityMatch?.[1] ? parseInt(priorityMatch[1], 10) : 2;
    const priority = priorityValue >= 1 && priorityValue <= 3 ? priorityValue : 2;

    /* -----------------------
       Update task with label and priority
    ------------------------ */
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({ label, priority })
      .eq("task_id", task.task_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("❌ Error in create-task-with-ai:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/* =======================
   Start Server
======================= */
Deno.serve(createTaskWithAI);
