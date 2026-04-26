import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(key, {
      // Clerk / project pins Stripe types to LatestApiVersion; runtime accepts 2024-06-20 per Stripe API.
      apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    });
  }
  return stripe;
}
