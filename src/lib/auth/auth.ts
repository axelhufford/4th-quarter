import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db/client";
import { users, accounts, sessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      // Upsert user
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      let userId: string;
      if (existing.length > 0) {
        userId = existing[0].id;
        await db
          .update(users)
          .set({ name: user.name, image: user.image, updatedAt: new Date() })
          .where(eq(users.id, userId));
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            email: user.email,
            name: user.name,
            image: user.image,
          })
          .returning();
        userId = newUser.id;
      }

      // Upsert account link
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        )
        .limit(1);

      if (existingAccount.length === 0) {
        await db.insert(accounts).values({
          userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          type: account.type,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        });
      }

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email))
          .limit(1);
        if (user) {
          token.userId = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
