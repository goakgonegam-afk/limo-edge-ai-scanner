import { NextResponse } from "next/server";
import { setSessionCookie, toPublicUser } from "@/lib/auth";
import { createUser, StoreError } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const user = await createUser(email, password);
    await setSessionCookie(user.id);
    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof StoreError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}
