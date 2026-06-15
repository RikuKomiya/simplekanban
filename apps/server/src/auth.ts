import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  account,
  session,
  user,
  verification,
  type Database,
} from '@simplekanban/db';

/** Google OAuth credentials. Presence of this object enables Google sign-in. */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Optional Google Workspace / Cloud organization hosted domain restriction.
   * This is intentionally separate from allowedEmailDomains, which is enforced
   * by our database hook using the user's email address.
   */
  hostedDomain?: string;
}

export interface AuthConfig {
  secret: string;
  baseURL: string;
  /** Extra trusted origins (dev: vite 5173 + server 8787). */
  trustedOrigins: string[];
  /**
   * Enable email/password sign-in. Toggled via env so it can be left on in dev
   * (no Google client needed locally) and turned off in prod (Google-only).
   */
  emailAndPassword?: boolean;
  /** Google OAuth credentials. When omitted, the Google provider is not registered. */
  google?: GoogleOAuthConfig;
  /**
   * Allowed email domains (lowercased, no `@`). Empty array = no restriction.
   * Enforced on user creation for every provider (Google and email/password).
   */
  allowedEmailDomains?: string[];
}

/** Public-safe view of which sign-in methods are enabled (served to the web UI). */
export interface AuthMethods {
  emailPassword: boolean;
  google: boolean;
}

/** Derive the public auth-methods descriptor from a config. */
export function authMethodsOf(config: AuthConfig): AuthMethods {
  return {
    emailPassword: config.emailAndPassword ?? true,
    google: Boolean(config.google),
  };
}

/**
 * Build a better-auth instance bound to the given drizzle database.
 *
 * Constructed per-request on Workers (env-derived db) and once per process in
 * dev. Sign-in methods are config-driven: email/password and/or Google. When
 * `allowedEmailDomains` is non-empty, user creation is rejected for any email
 * outside those domains, so a Google account from another domain can't sign up.
 */
export function createAuth(db: Database, config: AuthConfig) {
  const allowedDomains = (config.allowedEmailDomains ?? []).map((d) =>
    d.trim().toLowerCase(),
  );
  const hostedDomain = config.google?.hostedDomain?.trim().toLowerCase();

  return betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: config.emailAndPassword ?? true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            ...(hostedDomain ? { hd: hostedDomain } : {}),
          },
        }
      : undefined,
    account: {
      accountLinking: {
        // Auto-link a Google login to an existing user with the same email.
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    databaseHooks:
      allowedDomains.length > 0
        ? {
            user: {
              create: {
                before: async (u) => {
                  const domain = (u.email ?? '').toLowerCase().split('@')[1];
                  if (!domain || !allowedDomains.includes(domain)) {
                    throw new APIError('FORBIDDEN', {
                      message: `Sign-in is restricted to: ${allowedDomains.join(', ')}`,
                    });
                  }
                },
              },
            },
          }
        : undefined,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user, session, account, verification },
    }),
  });
}

export type Auth = ReturnType<typeof createAuth>;
