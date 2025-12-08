import Stripe from "npm:stripe";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  // IMPORTANT: Read raw body, NOT JSON
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  // Auth client using service-role
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_email;
        const customerId = session.customer;

        await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            subscription_status: "active",
            subscription_level: "premium",
          })
          .eq("email", email);

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_level: "premium",
          })
          .eq("stripe_customer_id", invoice.customer);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
            subscription_level: "free",
          })
          .eq("stripe_customer_id", sub.customer);
        break;
      }

      default:
        console.log("Ignoring:", event.type);
    }
  } catch (err) {
    console.error("❌ DB update error:", err.message);
    return new Response("Error", { status: 400 });
  }

  return new Response("OK", { status: 200 });
});
