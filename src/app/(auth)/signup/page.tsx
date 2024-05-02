import { db } from "@/db";
import { hash } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { lucia } from "@/auth";
import { redirect } from "next/navigation";
import { generateIdFromEntropySize } from "lucia";
import { userTable } from "@/db/schema";
import Link from "next/link";

interface ActionResult {
  error: string;
}

export default async function Page() {
  return (
    <div className="flex flex-col justify-center w-full h-screen items-center gap-10">
      <h1 className="text-3xl">Create an account</h1>
      <form
        action={signup}
        className="
        flex flex-col gap-5
      "
      >
        <label htmlFor="username">Username</label>
        <input
          className="bg-black p-1 border"
          name="username"
          id="username"
          required
          minLength={3}
          maxLength={31}
        />
        <label htmlFor="password">Password</label>
        <input
          className="bg-black p-1 border"
          type="password"
          name="password"
          id="password"
          required
          minLength={6}
          maxLength={255}
        />
        <div>
          <Link href="/login">Already have an account? Login here</Link>
        </div>
        <button className="border p-2 w-4/5 mx-auto rounded-md bg-blue-700">
          Continue
        </button>
      </form>
    </div>
  );
}
async function signup(formData: FormData): Promise<ActionResult> {
  "use server";
  const username = formData.get("username");
  // username must be between 4 ~ 31 characters, and only consists of lowercase letters, 0-9, -, and _
  // keep in mind some database (e.g. mysql) are case insensitive
  console.log({ username });
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
  console.log({ password });

  const passwordHash = await hash(password, {
    // recommended minimum parameters
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  const userId = generateIdFromEntropySize(10); // 16 characters long

  // TODO: check if username is already used
  await db.insert(userTable).values({
    id: userId,
    username: username,
    password_hash: passwordHash,
  });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  console.log("here");
  redirect("/");
}
