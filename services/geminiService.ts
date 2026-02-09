import { Profile } from "../types";

export const generateMedicalIcebreaker = async (
  myProfile: Profile,
  matchProfile: Profile
): Promise<string> => {
  try {
    const response = await fetch('/api/generate-icebreaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ myProfile, matchProfile }),
    });

    if (response.ok) {
      const data = await response.json();
      if (typeof data?.text === 'string' && data.text.trim()) {
        return data.text.trim();
      }
    }
  } catch (error) {
    return "I seem to have lost my train of thought, but your profile is stunning.";
  }

  return "So, do you come to this hospital often?";
};
