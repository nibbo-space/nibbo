import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { ensureUserFamily } from "@/lib/family";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing idToken" },
        { status: 400 }
      );
    }

    if (!JWT_SECRET) {
      throw new Error("AUTH_SECRET or NEXTAUTH_SECRET not configured");
    }

    // Verify Google ID token
    let payload: GoogleTokenPayload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload() as GoogleTokenPayload;
    } catch (error) {
      console.error("Google token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return NextResponse.json(
        { error: "Email not provided by Google" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      const userId = randomUUID();
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: name || email,
          image: picture || null,
          emailVerified: new Date(),
          accounts: {
            create: {
              type: "oauth",
              provider: "google",
              providerAccountId: googleId,
              access_token: null,
              token_type: "Bearer",
              scope: "openid profile email",
            },
          },
        },
      });

      // Ensure user family
      await ensureUserFamily(userId);
    } else {
      // Update user with latest Google info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          image: picture || user.image,
        },
      });
    }

    // Check if user is admin
    const adminRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Admin" WHERE "userId" = ${user.id} LIMIT 1
    `;
    const isAdmin = adminRows.length > 0;

    // Generate JWT token for mobile app
    const appToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
        familyId: user.familyId,
        isAdmin,
        displayCurrency: user.displayCurrency,
        timeZone: user.timeZone,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      token: appToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        familyId: user.familyId,
        isAdmin,
        displayCurrency: user.displayCurrency,
        timeZone: user.timeZone,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
