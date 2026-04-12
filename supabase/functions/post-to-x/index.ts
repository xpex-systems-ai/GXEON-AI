import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TwitterApi } from "https://esm.sh/twitter-api-v2@1.15.0";

interface RequestBody {
  text: string;
  replyTo?: string;
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, replyTo }: RequestBody = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appKey = Deno.env.get("X_API_KEY");
    const appSecret = Deno.env.get("X_API_SECRET");
    const accessToken = Deno.env.get("X_ACCESS_TOKEN");
    const accessSecret = Deno.env.get("X_ACCESS_SECRET");

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      return new Response(
        JSON.stringify({ error: "Twitter credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });

    let tweet;
    if (replyTo) {
      tweet = await client.v2.reply(text, replyTo);
    } else {
      tweet = await client.v2.tweet(text);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tweetId: tweet.data.id,
        text: tweet.data.text,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error posting to X:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to post tweet" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
