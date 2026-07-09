import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";

const ALLOWED_HOSTED_DOMAIN = "fleetpanda.com";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      // Google only re-issues a refresh token occasionally — keep the old one otherwise.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (err) {
    console.error("Failed to refresh Google access token:", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Hints Google's account chooser toward the org domain — not itself
          // a security boundary, the signIn callback below enforces that part.
          hd: ALLOWED_HOSTED_DOMAIN,
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/documents.readonly",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    // No dedicated sign-in page — app/page.tsx renders the sign-in screen
    // itself when there's no session. Errors (e.g. wrong domain) redirect
    // here as a `?error=` query param that the page reads and displays.
    error: "/",
  },
  callbacks: {
    async signIn({ profile }) {
      // Belt-and-suspenders: the `hd` authorization param above already
      // steers Google's UI toward the org domain, but only this check
      // actually blocks a non-FleetPanda account from completing sign-in.
      return profile?.hd === ALLOWED_HOSTED_DOMAIN;
    },
    async jwt({ token, account }) {
      if (account) {
        // Initial sign-in: persist the Google tokens onto our JWT.
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
