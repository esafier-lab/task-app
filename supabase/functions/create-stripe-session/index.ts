import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ----------------------------
// Load and validate secrets
// ----------------------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is not set");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY environment variable is not set");
}
if (!STRIPE_PRICE_ID) {
  throw new Error(
    "STRIPE_PRICE_ID environment variable is not set. Use: supabase secrets set STRIPE_PRICE_ID=price_xxx"
  );
}

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ----------------------------
// Main Function
// ----------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    // Create Supabase client with the user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Fetch profile fields
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_status")
      .eq("id", user.id)
      .single();

    // ---------------------------------------
    // EXISTING CUSTOMER → CUSTOMER PORTAL
    // ---------------------------------------
    if (profile?.stripe_customer_id) {
      console.log("🔁 Returning Stripe Customer Portal");

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${SUPABASE_URL}`,
      });

      return new Response(
        JSON.stringify({
          url: portalSession.url,
          type: "customer_portal",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------
    // NEW CUSTOMER → CHECKOUT SESSION
    // ---------------------------------------
    console.log("💳 Creating Stripe Checkout Session...");

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,

      // Pricing definition
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      // ❗ IMPORTANT: No trial, no subscription_data fixes your error
      success_url: `${SUPABASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SUPABASE_URL}/cancel`,
    });

    console.log("✨ Returning checkout URL");

    return new Response(
      JSON.stringify({
        url: checkoutSession.url,
        type: "checkout",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ createStripeSession error:", err?.message);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
