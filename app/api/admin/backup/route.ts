import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  backupFileTimestamp,
  createFullBackupBuffer,
  formatBytes,
  getUploadsSummary,
} from "@/lib/backup/archive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploads = getUploadsSummary();

    return NextResponse.json({
      uploads: {
        fileCount: uploads.fileCount,
        totalBytes: uploads.totalBytes,
        totalSize: formatBytes(uploads.totalBytes),
      },
    });
  } catch (error) {
    console.error("Error fetching backup info:", error);
    return NextResponse.json({ error: "Failed to fetch backup info" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buffer = createFullBackupBuffer();
    const filename = `pixelroot-backup-${backupFileTimestamp()}.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}
