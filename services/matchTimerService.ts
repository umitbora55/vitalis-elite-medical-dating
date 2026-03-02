import { supabase } from '../src/lib/supabase';

export interface MatchTimerStatus {
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  totalMsLeft: number;
  isExpired: boolean;
  urgency: 'green' | 'yellow' | 'red';
  label: string;
}

export const matchTimerService = {
  /**
   * Get remaining time until first-message deadline for a match
   */
  getTimerStatus(deadlineIso: string | null | undefined): MatchTimerStatus {
    if (!deadlineIso) {
      return {
        hoursLeft: 0,
        minutesLeft: 0,
        secondsLeft: 0,
        totalMsLeft: 0,
        isExpired: false,
        urgency: 'green',
        label: '',
      };
    }

    const deadline = new Date(deadlineIso).getTime();
    const now = Date.now();
    const msLeft = deadline - now;

    if (msLeft <= 0) {
      return {
        hoursLeft: 0,
        minutesLeft: 0,
        secondsLeft: 0,
        totalMsLeft: 0,
        isExpired: true,
        urgency: 'red',
        label: 'Süre doldu',
      };
    }

    const totalSeconds = Math.floor(msLeft / 1000);
    const hoursLeft = Math.floor(totalSeconds / 3600);
    const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
    const secondsLeft = totalSeconds % 60;

    let urgency: 'green' | 'yellow' | 'red';
    if (hoursLeft < 12) urgency = 'red';
    else if (hoursLeft < 24) urgency = 'yellow';
    else urgency = 'green';

    const pad = (n: number) => String(n).padStart(2, '0');
    const label = `${pad(hoursLeft)}:${pad(minutesLeft)}:${pad(secondsLeft)}`;

    return { hoursLeft, minutesLeft, secondsLeft, totalMsLeft: msLeft, isExpired: false, urgency, label };
  },

  /**
   * Mark first message sent for a match (clears deadline)
   */
  async markFirstMessageSent(matchId: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update({ first_message_sent_at: new Date().toISOString() })
      .eq('id', matchId);

    if (error) {
      console.error('[matchTimerService] markFirstMessageSent error:', error);
    }
  },

  /**
   * Extend deadline by 48h for duty mode users
   */
  async extendDeadlineForDutyMode(matchId: string, userId: string): Promise<void> {
    await supabase.rpc('apply_duty_mode_deadline_extension', {
      p_match_id: matchId,
      p_user_id: userId,
    });
  },

  /**
   * Get match deadline from DB
   */
  async getMatchDeadline(matchId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('matches')
      .select('first_message_deadline, first_message_sent_at, is_expired')
      .eq('id', matchId)
      .single();

    if (error || !data) return null;
    if (data.first_message_sent_at || data.is_expired) return null;
    return data.first_message_deadline;
  },
};
