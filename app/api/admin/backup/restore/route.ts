import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { sqlite } from "@/lib/db";
import {
  extractFullBackupZip,
  restoreUploadsFromDirectory,
  savePreRestoreSnapshot,
} from "@/lib/backup/archive";
import { importDatabaseSql } from "@/lib/backup/sql-dump";

export const dynamic = "force-dynamic";

const MAX_ZIP_SIZE = 500 * 1024 * 1024;

function revalidateSite() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/portfolio");
  revalidatePath("/packages");
  revalidatePath("/team");
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "Upload a .zip backup file created by this dashboard." },
        { status: 400 }
      );
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${Math.round(MAX_ZIP_SIZE / (1024 * 1024))}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const snapshotPath = savePreRestoreSnapshot();

    const { sql, uploadsDir } = extractFullBackupZip(buffer);
    importDatabaseSql(sqlite, sql);
    if (uploadsDir) {
      restoreUploadsFromDirectory(uploadsDir);
    }

    revalidateSite();

    return NextResponse.json({
      success: true,
      message: "Backup restored — database and uploaded files were replaced.",
      snapshotPath,
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    );
  }
}
