import { db } from "@/db";
import { verify } from "@node-rs/argon2";

import { cookies } from "next/headers";
import { lucia } from "@/auth";
import { redirect } from "next/navigation";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

interface ActionResult {
  error: string;
}

export default async function Page() {
  return (
    <div className="flex flex-col justify-center w-full h-screen items-center gap-10">
      <h1 className="text-3xl">Login to account</h1>
      <form action={login} className="flex flex-col gap-5">
        <label htmlFor="username">Username</label>
        <input
          className="bg-black p-1 border"
          name="username"
          id="username"
          minLength={3}
          maxLength={31}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          className="bg-black p-1 border"
          type="password"
          name="password"
          id="password"
          minLength={6}
          maxLength={255}
          required
        />
        <div>
          <Link href="/signup">Don&apos;t have an account? Sign up here</Link>
        </div>
        <button className="border p-2 w-4/5 mx-auto rounded-md bg-blue-700">
          Continue
        </button>
      </form>
    </div>
  );
}
async function login(formData: FormData): Promise<ActionResult> {
  "use server";
  const username = formData.get("username");
  if (
    typeof username !== "string" ||
    username.length < 3 ||
    username.length > 31 ||
    !/^[a-z0-9_-]+$/.test(username)
  ) {
    return {
      error: "Invalid username",
    };
  }
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    password.length < 6 ||
    password.length > 255
  ) {
    return {
      error: "Invalid password",
    };
  }

  const existingUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username));
  console.log({ existingUser });
  if (existingUser.length === 0) {
    // NOTE:
    // Returning immediately allows malicious actors to figure out valid usernames from response times,
    // allowing them to only focus on guessing passwords in brute-force attacks.
    // As a preventive measure, you may want to hash passwords even for invalid usernames.
    // However, valid usernames can be already be revealed with the signup page among other methods.
    // It will also be much more resource intensive.
    // Since protecting against this is non-trivial,
    // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
    // If usernames are public, you may outright tell the user that the username is invalid.
    return {
      error: "Incorrect username or password",
    };
  }

  const validPassword = await verify(existingUser[0]?.password_hash, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  if (!validPassword) {
    return {
      error: "Incorrect username or password",
    };
  }

  const session = await lucia.createSession(existingUser[0].id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  redirect("/");
}
