"use server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { projectTable } from "@/db/schema";
import { validateRequest } from "@/auth";

export const handleFormSubmit = async (e: FormData) => {
  const project = e.get("project");
  const template = e.get("template");
  if (!project || !template) {
    return;
  }

  const { user } = await validateRequest();
  if (!user) {
    return redirect("/login");
  }
  const data = await db
    .insert(projectTable)
    .values({
      name: project.toString(),
      template: template.toString(),
      userId: user.id,
    })
    .returning({ id: projectTable.id });
  console.log({ data });

  if (data[0].id) {
    redirect(`/p/${data[0].id}`);
  }
  return undefined;
};
