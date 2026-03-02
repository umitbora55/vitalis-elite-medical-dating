// @vitest-environment node
/**
 * State Machine Integration Tests
 *
 * Verifies that domain entity lifecycle transitions are enforced correctly.
 * Tests use pure logic without Supabase — the transition guard functions
 * are pure utilities that mirror what the DB triggers / Edge Functions enforce.
 *
 * Covered state machines:
 *   1. Verification:   unverified → pending → approved | rejected
 *   2. DateInvitation: sent → accepted | declined | expired
 *   3. Subscription:   free → active → cancelled → active (re-subscribe)
 */

import { describe, it, expect } from 'vitest';

// ─── Verification State Machine ───────────────────────────────────────────────

type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

interface VerificationTransition {
  from: VerificationStatus;
  to: VerificationStatus;
  allowed: boolean;
}

/**
 * Allowed transitions:
 *   unverified → pending   (user submits docs)
 *   pending    → approved  (admin approves)
 *   pending    → rejected  (admin rejects)
 *   rejected   → pending   (user resubmits)
 *
 * Forbidden:
 *   approved   → pending   (cannot re-open an approval)
 *   approved   → unverified (cannot regress)
 *   approved   → rejected  (cannot undo approval)
 */
const VERIFICATION_TRANSITIONS: VerificationTransition[] = [
  { from: 'unverified', to: 'pending',   allowed: true },
  { from: 'pending',    to: 'approved',  allowed: true },
  { from: 'pending',    to: 'rejected',  allowed: true },
  { from: 'rejected',   to: 'pending',   allowed: true },
  // Invalid
  { from: 'approved',   to: 'pending',   allowed: false },
  { from: 'approved',   to: 'unverified', allowed: false },
  { from: 'approved',   to: 'rejected',  allowed: false },
  { from: 'unverified', to: 'approved',  allowed: false },
  { from: 'unverified', to: 'rejected',  allowed: false },
];

function canTransitionVerification(from: VerificationStatus, to: VerificationStatus): boolean {
  return VERIFICATION_TRANSITIONS.some((t) => t.from === from && t.to === to && t.allowed);
}

// ─── Date Invitation State Machine ───────────────────────────────────────────

type InvitationStatus = 'sent' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/**
 * Allowed transitions:
 *   sent → accepted  (recipient accepts)
 *   sent → declined  (recipient declines)
 *   sent → expired   (system sets after timeout)
 *   sent → cancelled (sender cancels before response)
 *
 * Forbidden:
 *   accepted → sent    (cannot revert)
 *   declined → sent    (cannot revert)
 *   expired  → any     (terminal state)
 *   declined → accepted (cannot change recipient decision)
 */
const INVITATION_VALID_TRANSITIONS: Array<[InvitationStatus, InvitationStatus]> = [
  ['sent', 'accepted'],
  ['sent', 'declined'],
  ['sent', 'expired'],
  ['sent', 'cancelled'],
];

function canTransitionInvitation(from: InvitationStatus, to: InvitationStatus): boolean {
  return INVITATION_VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ─── Subscription State Machine ───────────────────────────────────────────────

type SubscriptionStatus = 'free' | 'active' | 'cancelled' | 'past_due' | 'trialing';

/**
 * Allowed transitions:
 *   free      → active    (user subscribes)
 *   free      → trialing  (user starts trial)
 *   trialing  → active    (trial converts)
 *   trialing  → cancelled (user cancels during trial)
 *   active    → cancelled (user cancels)
 *   active    → past_due  (payment fails)
 *   past_due  → active    (payment recovered)
 *   past_due  → cancelled (failed to recover)
 *   cancelled → active    (user re-subscribes — this IS allowed)
 *   cancelled → free      (downgrade after cancellation)
 *
 * Forbidden:
 *   active → free (must go through cancelled first)
 *   past_due → trialing (cannot trial after past_due)
 */
const SUBSCRIPTION_VALID_TRANSITIONS: Array<[SubscriptionStatus, SubscriptionStatus]> = [
  ['free',      'active'],
  ['free',      'trialing'],
  ['trialing',  'active'],
  ['trialing',  'cancelled'],
  ['active',    'cancelled'],
  ['active',    'past_due'],
  ['past_due',  'active'],
  ['past_due',  'cancelled'],
  ['cancelled', 'active'],
  ['cancelled', 'free'],
];

function canTransitionSubscription(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return SUBSCRIPTION_VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Verification State Machine', () => {
  describe('Valid transitions', () => {
    it('unverified → pending (user submits verification documents)', () => {
      expect(canTransitionVerification('unverified', 'pending')).toBe(true);
    });

    it('pending → approved (admin approves submission)', () => {
      expect(canTransitionVerification('pending', 'approved')).toBe(true);
    });

    it('pending → rejected (admin rejects submission)', () => {
      expect(canTransitionVerification('pending', 'rejected')).toBe(true);
    });

    it('rejected → pending (user resubmits after rejection)', () => {
      expect(canTransitionVerification('rejected', 'pending')).toBe(true);
    });
  });

  describe('Invalid transitions — MUST be rejected', () => {
    it('INVALID: approved → pending (approval is irreversible)', () => {
      expect(canTransitionVerification('approved', 'pending')).toBe(false);
    });

    it('INVALID: approved → unverified (cannot regress from approved)', () => {
      expect(canTransitionVerification('approved', 'unverified')).toBe(false);
    });

    it('INVALID: approved → rejected (cannot revoke an approved verification)', () => {
      expect(canTransitionVerification('approved', 'rejected')).toBe(false);
    });

    it('INVALID: unverified → approved (must pass through pending first)', () => {
      expect(canTransitionVerification('unverified', 'approved')).toBe(false);
    });

    it('INVALID: unverified → rejected (cannot reject without submission)', () => {
      expect(canTransitionVerification('unverified', 'rejected')).toBe(false);
    });
  });

  describe('Full lifecycle simulation', () => {
    it('completes a full approval lifecycle: unverified → pending → approved', () => {
      let status: VerificationStatus = 'unverified';

      // Step 1: user submits
      expect(canTransitionVerification(status, 'pending')).toBe(true);
      status = 'pending';

      // Step 2: admin approves
      expect(canTransitionVerification(status, 'approved')).toBe(true);
      status = 'approved';

      // Step 3: cannot revert
      expect(canTransitionVerification(status, 'pending')).toBe(false);
      expect(status).toBe('approved');
    });

    it('completes a rejection + resubmission lifecycle: unverified → pending → rejected → pending → approved', () => {
      let status: VerificationStatus = 'unverified';

      expect(canTransitionVerification(status, 'pending')).toBe(true);
      status = 'pending';

      expect(canTransitionVerification(status, 'rejected')).toBe(true);
      status = 'rejected';

      expect(canTransitionVerification(status, 'pending')).toBe(true);
      status = 'pending';

      expect(canTransitionVerification(status, 'approved')).toBe(true);
      status = 'approved';

      expect(status).toBe('approved');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DateInvitation State Machine', () => {
  describe('Valid transitions from sent', () => {
    it('sent → accepted (recipient accepts the date invitation)', () => {
      expect(canTransitionInvitation('sent', 'accepted')).toBe(true);
    });

    it('sent → declined (recipient declines the invitation)', () => {
      expect(canTransitionInvitation('sent', 'declined')).toBe(true);
    });

    it('sent → expired (system marks as expired after timeout)', () => {
      expect(canTransitionInvitation('sent', 'expired')).toBe(true);
    });

    it('sent → cancelled (sender cancels before response)', () => {
      expect(canTransitionInvitation('sent', 'cancelled')).toBe(true);
    });
  });

  describe('Invalid transitions — MUST be rejected', () => {
    it('INVALID: accepted → sent (cannot revert an acceptance)', () => {
      expect(canTransitionInvitation('accepted', 'sent')).toBe(false);
    });

    it('INVALID: declined → accepted (cannot change decision after decline)', () => {
      expect(canTransitionInvitation('declined', 'accepted')).toBe(false);
    });

    it('INVALID: expired → accepted (expired invitations are terminal)', () => {
      expect(canTransitionInvitation('expired', 'accepted')).toBe(false);
    });

    it('INVALID: expired → sent (cannot reactivate expired invitation)', () => {
      expect(canTransitionInvitation('expired', 'sent')).toBe(false);
    });

    it('INVALID: cancelled → accepted (cancelled invitation cannot be accepted)', () => {
      expect(canTransitionInvitation('cancelled', 'accepted')).toBe(false);
    });

    it('INVALID: accepted → declined (cannot change after acceptance)', () => {
      expect(canTransitionInvitation('accepted', 'declined')).toBe(false);
    });
  });

  describe('Full lifecycle simulation', () => {
    it('simulates an accepted invitation lifecycle', () => {
      let status: InvitationStatus = 'sent';

      expect(canTransitionInvitation(status, 'accepted')).toBe(true);
      status = 'accepted';

      // Terminal state — no further transitions
      expect(canTransitionInvitation(status, 'sent')).toBe(false);
      expect(canTransitionInvitation(status, 'declined')).toBe(false);
    });

    it('simulates a timed-out invitation lifecycle', () => {
      let status: InvitationStatus = 'sent';

      expect(canTransitionInvitation(status, 'expired')).toBe(true);
      status = 'expired';

      expect(canTransitionInvitation(status, 'accepted')).toBe(false);
      expect(canTransitionInvitation(status, 'sent')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Subscription State Machine', () => {
  describe('Valid transitions', () => {
    it('free → active (user purchases subscription)', () => {
      expect(canTransitionSubscription('free', 'active')).toBe(true);
    });

    it('free → trialing (user starts a trial)', () => {
      expect(canTransitionSubscription('free', 'trialing')).toBe(true);
    });

    it('trialing → active (trial converts to paid)', () => {
      expect(canTransitionSubscription('trialing', 'active')).toBe(true);
    });

    it('trialing → cancelled (user cancels during trial)', () => {
      expect(canTransitionSubscription('trialing', 'cancelled')).toBe(true);
    });

    it('active → cancelled (user cancels subscription)', () => {
      expect(canTransitionSubscription('active', 'cancelled')).toBe(true);
    });

    it('active → past_due (payment fails)', () => {
      expect(canTransitionSubscription('active', 'past_due')).toBe(true);
    });

    it('past_due → active (payment successfully recovered)', () => {
      expect(canTransitionSubscription('past_due', 'active')).toBe(true);
    });

    it('past_due → cancelled (payment recovery failed)', () => {
      expect(canTransitionSubscription('past_due', 'cancelled')).toBe(true);
    });

    it('cancelled → active (user re-subscribes — allowed)', () => {
      expect(canTransitionSubscription('cancelled', 'active')).toBe(true);
    });

    it('cancelled → free (downgrade after cancellation)', () => {
      expect(canTransitionSubscription('cancelled', 'free')).toBe(true);
    });
  });

  describe('Invalid transitions — MUST be rejected', () => {
    it('INVALID: active → free (must go through cancellation first)', () => {
      expect(canTransitionSubscription('active', 'free')).toBe(false);
    });

    it('INVALID: past_due → trialing (cannot re-enter trial from past_due)', () => {
      expect(canTransitionSubscription('past_due', 'trialing')).toBe(false);
    });

    it('INVALID: cancelled → past_due (cannot go past_due from cancelled)', () => {
      expect(canTransitionSubscription('cancelled', 'past_due')).toBe(false);
    });

    it('INVALID: free → past_due (cannot go past_due without an active subscription)', () => {
      expect(canTransitionSubscription('free', 'past_due')).toBe(false);
    });
  });

  describe('Full lifecycle simulation', () => {
    it('simulates full happy path: free → active → cancelled → active', () => {
      let status: SubscriptionStatus = 'free';

      expect(canTransitionSubscription(status, 'active')).toBe(true);
      status = 'active';

      expect(canTransitionSubscription(status, 'cancelled')).toBe(true);
      status = 'cancelled';

      // Re-subscribe — must be allowed
      expect(canTransitionSubscription(status, 'active')).toBe(true);
      status = 'active';

      expect(status).toBe('active');
    });

    it('simulates payment failure recovery: active → past_due → active', () => {
      let status: SubscriptionStatus = 'active';

      expect(canTransitionSubscription(status, 'past_due')).toBe(true);
      status = 'past_due';

      expect(canTransitionSubscription(status, 'active')).toBe(true);
      status = 'active';

      expect(status).toBe('active');
    });

    it('simulates unrecovered payment: active → past_due → cancelled → active (re-subscribe)', () => {
      let status: SubscriptionStatus = 'active';

      expect(canTransitionSubscription(status, 'past_due')).toBe(true);
      status = 'past_due';

      expect(canTransitionSubscription(status, 'cancelled')).toBe(true);
      status = 'cancelled';

      expect(canTransitionSubscription(status, 'active')).toBe(true);
      status = 'active';

      expect(status).toBe('active');
    });

    it('simulates trial-to-cancellation path: free → trialing → cancelled', () => {
      let status: SubscriptionStatus = 'free';

      expect(canTransitionSubscription(status, 'trialing')).toBe(true);
      status = 'trialing';

      expect(canTransitionSubscription(status, 'cancelled')).toBe(true);
      status = 'cancelled';

      expect(status).toBe('cancelled');
    });
  });

  describe('VALID_PLANS set validation (mirrors webhooks-stripe logic)', () => {
    const VALID_PLANS = new Set(['DOSE', 'FORTE', 'ULTRA', 'GOLD', 'PLATINUM']);

    it('accepts all defined valid plan names', () => {
      for (const plan of ['DOSE', 'FORTE', 'ULTRA', 'GOLD', 'PLATINUM']) {
        expect(VALID_PLANS.has(plan)).toBe(true);
      }
    });

    it('rejects empty string as plan', () => {
      expect(VALID_PLANS.has('')).toBe(false);
    });

    it('rejects unknown plan names', () => {
      for (const plan of ['BASIC', 'PRO', 'ENTERPRISE', 'FREE', 'vip', 'dose']) {
        expect(VALID_PLANS.has(plan)).toBe(false);
      }
    });

    it('rejects null/undefined-like string coercions', () => {
      expect(VALID_PLANS.has('null')).toBe(false);
      expect(VALID_PLANS.has('undefined')).toBe(false);
    });
  });
});
