// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { myProfile, matchProfile } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ text: 'So, do you come to this hospital often?' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = `Create a short, professional but playful icebreaker for a medical dating app.\nMy profile: ${JSON.stringify(
      myProfile,
    )}\nTheir profile: ${JSON.stringify(matchProfile)}\nReturn one sentence.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to generate icebreaker');
    }

    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I seem to have lost my train of thought, but your profile is stunning.';

    return new Response(JSON.stringify({ text: text.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ text: 'So, do you come to this hospital often?' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
