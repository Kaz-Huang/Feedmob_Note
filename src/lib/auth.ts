import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'feedmob.com').toLowerCase();

type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
  hd?: string;
};

function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${allowedDomain}`) && normalized.length > allowedDomain.length + 1;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          hd: allowedDomain,
          scope: 'openid email profile',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, profile }) {
      const googleProfile = (profile || {}) as GoogleProfile;
      const email = googleProfile.email || user.email;

      // `hd` is only a Google login hint, so the actual authorization check is
      // the verified Workspace email domain below.
      if (googleProfile.hd && googleProfile.hd.toLowerCase() !== allowedDomain) {
        return false;
      }
      if (googleProfile.email_verified === false) return false;
      return isAllowedEmail(email);
    },
    async jwt({ token, user, profile }) {
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      if (user?.image) token.picture = user.image;

      const googleProfile = (profile || {}) as GoogleProfile;
      if (googleProfile.email) token.email = googleProfile.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email;
      if (session.user && token.name) session.user.name = token.name;
      if (session.user && token.picture) session.user.image = token.picture as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Fall back to the application root for malformed callback URLs.
      }
      return baseUrl;
    },
  },
};
