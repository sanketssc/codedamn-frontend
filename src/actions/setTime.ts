"use server";

import { db } from "@/db";
import { runningTaskTable } from "@/db/schema";
import { deleteVM } from "@/utils/awsOps";
import { eq } from "drizzle-orm";

export async function setTime(projectId: string) {
  console.log("Deleting VM");
  const del = await deleteVM(projectId);
  const deletedRunningTask = await db
    .delete(runningTaskTable)
    .where(eq(runningTaskTable.projectId, projectId));
}
