import { Profile } from "../types";
import { supabase } from "../src/lib/supabase";

export const generateMedicalIcebreaker = async (
  myProfile: Profile,
  matchProfile: Profile
): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
      body: { myProfile, matchProfile },
    });

    if (!error && typeof data?.text === 'string' && data.text.trim()) {
      return data.text.trim();
    }
  } catch (error) {
    return "I seem to have lost my train of thought, but your profile is stunning.";
  }

  return "So, do you come to this hospital often?";
};
