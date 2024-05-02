import { redirect } from "next/navigation";
import { validateRequest } from "@/auth";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await validateRequest();
  console.log({ user });
  if (!user) {
    return redirect("/login");
  }
  return <>{children}</>;
}
