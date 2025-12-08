// Setup Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function createTaskWithAI(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    if (!title) throw new Error("Missing title");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    // Initialize Supabase client with user JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Optional subscription check
    const { data: profile } = await supabase
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

    // Insert base task
    const { data: task, error: taskInsertError } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        completed: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (taskInsertError) throw taskInsertError;

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // AI label generation prompt
    const prompt = `Task title: "${title}"
Description: "${description ?? ""}"

Choose ONE label only from this list:
- work
- personal
- priority
- shopping
- home

Return ONLY the label word.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 5,
    });

    const raw = completion.choices[0].message.content
      ?.toLowerCase()
      .trim();

    const VALID = ["work", "personal", "priority", "shopping", "home"];
    const label = VALID.includes(raw) ? raw : null;

    // Update task with label
    const { data: updated, error: updateError } = await supabase
      .from("tasks")
      .update({ label })
      .eq("task_id", task.task_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("❌ Error in create-task-with-ai:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(createTaskWithAI);
