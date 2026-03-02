/**
 * trust.ts — Trust root management CLI
 *
 * Manages the signed keyring: add keys, rotate keys, revoke keys.
 * Operations:
 *   add      — add a new key entry to the keyring
 *   rotate   — mark old key as revoked + add new key
 *   revoke   — mark a key as revoked by kid
 *   list     — list all key entries
 *   verify   — verify that a kid is valid at effectiveTime
 *
 * Required env vars:
 *   WAR_TRUST_OP        — operation: "add" | "rotate" | "revoke" | "list" | "verify"
 *   WAR_KEYRING_PATH    — path to keyring JSON file
 *
 * For "add"/"rotate":
 *   WAR_KEY_KID         — key identifier
 *   WAR_KEY_PEM         — public key PEM
 *   WAR_KEY_VALID_FROM  — RFC3339
 *   WAR_KEY_VALID_TO    — RFC3339
 *
 * For "rotate"/"revoke":
 *   WAR_REVOKE_KID      — kid to revoke
 *   WAR_REVOKE_AT       — RFC3339 revocation time (defaults to now)
 *
 * For "verify":
 *   WAR_VERIFY_KID      — kid to verify
 *   WAR_EFFECTIVE_TIME  — RFC3339 (defaults to now)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolvePublicKey, buildInMemoryKeyring, checkKeyValidity } from "../core/trustRoot.js";
import type { SignedKeyring, KeyEntry } from "../core/trustRoot.js";
import { toRfc3339 } from "../core/timeModel.js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`trust: missing required env var ${key}`);
  return v;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

function loadKeyring(path: string): SignedKeyring {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as SignedKeyring;
  } catch {
    // Return empty keyring if file doesn't exist
    return buildInMemoryKeyring([]);
  }
}

function saveKeyring(path: string, keyring: SignedKeyring): void {
  writeFileSync(path, JSON.stringify(keyring, null, 2), "utf-8");
}

async function main(): Promise<void> {
  console.log("WAR Harness — Trust Root Management CLI (TRUST_ROOT_SPEC@1.1)");
  console.log("─".repeat(60));

  const op          = requireEnv("WAR_TRUST_OP");
  const keyringPath = requireEnv("WAR_KEYRING_PATH");

  const keyring = loadKeyring(keyringPath);

  switch (op) {
    case "list": {
      console.log(`\nKeyring entries (${keyring.entries.length} total):`);
      for (const entry of keyring.entries) {
        const revokedStr = entry.revoked_at !== undefined
          ? ` [REVOKED at ${entry.revoked_at}]`
          : "";
        console.log(`  kid=${entry.kid} valid=${entry.valid_from}..${entry.valid_to}${revokedStr}`);
      }
      break;
    }

    case "add": {
      const kid       = requireEnv("WAR_KEY_KID");
      const pem       = requireEnv("WAR_KEY_PEM");
      const validFrom = requireEnv("WAR_KEY_VALID_FROM");
      const validTo   = requireEnv("WAR_KEY_VALID_TO");

      const entry: KeyEntry = {
        kid,
        publicKeyPem: pem,
        valid_from:   validFrom,
        valid_to:     validTo,
        alg:          "ed25519",
      };

      keyring.entries.push(entry);
      saveKeyring(keyringPath, keyring);
      console.log(`Added key: kid=${kid}`);
      break;
    }

    case "revoke": {
      const revokeKid = requireEnv("WAR_REVOKE_KID");
      const revokeAt  = optionalEnv("WAR_REVOKE_AT") ?? toRfc3339();

      const entry = keyring.entries.find((e) => e.kid === revokeKid);
      if (!entry) {
        console.error(`Key not found: kid=${revokeKid}`);
        process.exit(1);
      }

      // Mark as revoked (entries is a mutable array from the loaded JSON)
      (entry as unknown as Record<string, unknown>)["revoked_at"] = revokeAt;
      saveKeyring(keyringPath, keyring);
      console.log(`Revoked key: kid=${revokeKid} at=${revokeAt}`);
      break;
    }

    case "rotate": {
      // Revoke old key + add new key
      const revokeKid = requireEnv("WAR_REVOKE_KID");
      const revokeAt  = optionalEnv("WAR_REVOKE_AT") ?? toRfc3339();
      const newKid    = requireEnv("WAR_KEY_KID");
      const newPem    = requireEnv("WAR_KEY_PEM");
      const validFrom = requireEnv("WAR_KEY_VALID_FROM");
      const validTo   = requireEnv("WAR_KEY_VALID_TO");

      const oldEntry = keyring.entries.find((e) => e.kid === revokeKid);
      if (oldEntry) {
        (oldEntry as unknown as Record<string, unknown>)["revoked_at"] = revokeAt;
        console.log(`Revoked old key: kid=${revokeKid} at=${revokeAt}`);
      }

      const newEntry: KeyEntry = {
        kid:          newKid,
        publicKeyPem: newPem,
        valid_from:   validFrom,
        valid_to:     validTo,
        alg:          "ed25519",
      };

      keyring.entries.push(newEntry);
      saveKeyring(keyringPath, keyring);
      console.log(`Added new key: kid=${newKid}`);
      break;
    }

    case "verify": {
      const verifyKid   = requireEnv("WAR_VERIFY_KID");
      const effectiveAt = optionalEnv("WAR_EFFECTIVE_TIME") ?? toRfc3339();
      const effectiveDate = new Date(effectiveAt);

      const result = await resolvePublicKey(
        verifyKid,
        "SIGNED_KEYRING",
        JSON.stringify(keyring),
        effectiveDate,
      );

      if (result.valid) {
        console.log(`VALID: kid=${verifyKid} at ${effectiveAt}`);
      } else {
        console.error(`INVALID: kid=${verifyKid} — ${result.reason ?? "unknown"}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown operation: ${op}`);
      console.error(`Valid operations: add, rotate, revoke, list, verify`);
      process.exit(1);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
