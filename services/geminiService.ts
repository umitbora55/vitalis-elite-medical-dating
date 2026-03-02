import { Profile } from "../types";
import { supabase } from "../src/lib/supabase";

// AUDIT-FIX: SEC-002 — Send only non-PII fields to edge function instead of full Profile objects.
// The edge function already has server-side anonymization, but we should minimize what leaves the client.
export const generateMedicalIcebreaker = async (
  myProfile: Profile,
  matchProfile: Profile
): Promise<string> => {
  try {
    // Only send the minimal fields needed for icebreaker generation
    const minimalProfile = (p: Profile) => ({
      role: p.role,
      specialty: p.specialty,
      subSpecialty: p.subSpecialty,
      interests: (p.interests || []).slice(0, 3),
      personalityTags: (p.personalityTags || []).slice(0, 3),
    });

    const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
      body: {
        myProfile: minimalProfile(myProfile),
        matchProfile: minimalProfile(matchProfile),
      },
    });

    if (!error && typeof data?.text === 'string' && data.text.trim()) {
      return data.text.trim();
    }
  } catch {
    return "I seem to have lost my train of thought, but your profile is stunning.";
  }

  return "So, do you come to this hospital often?";
};
