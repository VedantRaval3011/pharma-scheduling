import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";

type MigrateQuery = {
  dryRun?: string;   // "true" | "false"
  limit?: string;    // e.g. "500"
  cursor?: string;   // last _id processed to continue
};

const isStability = (type?: string) =>
  typeof type === "string" && type.toLowerCase().includes("stability");

const parseDateOrNull = (value: any): Date | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query: MigrateQuery = {
      dryRun: searchParams.get("dryRun") || "true",
      limit: searchParams.get("limit") || "500",
      cursor: searchParams.get("cursor") || undefined,
    };

    const dryRun = query.dryRun === "true";
    const limit = Math.max(1, Math.min(2000, Number(query.limit) || 500));
    const cursor = query.cursor;

    const filter: any = {};
    if (cursor) filter._id = { $gt: cursor };

    // Fetch a window of docs
    const docs = await BatchInput.find(filter)
      .select(
        "_id typeOfSample manufacturingDate withdrawalDate batchNumber productCode productName"
      )
      .sort({ _id: 1 })
      .limit(limit)
      .lean();

    let toUpdate: Array<{
      _id: string;
      set: Partial<{
        manufacturingDate: Date | null;
        withdrawalDate: Date | null;
        updatedAt: Date;
      }>;
      reason: string;
      typeOfSample: string | undefined;
      batchNumber: string | undefined;
    }> = [];

    for (const d of docs) {
      const type = d.typeOfSample as string | undefined;
      const mfg = d.manufacturingDate ? new Date(d.manufacturingDate) : null;
      const wd = d.withdrawalDate ? new Date(d.withdrawalDate) : null;

      if (isStability(type)) {
        // Stability: ensure withdrawalDate set, manufacturingDate cleared
        const needWd = wd === null;
        const needClearMfg = mfg !== null;

        if (needWd || needClearMfg) {
          toUpdate.push({
            _id: String(d._id),
            set: {
              withdrawalDate: needWd ? new Date() : wd, // default now if missing; adjust if you want null instead
              manufacturingDate: null,
              updatedAt: new Date(),
            },
            reason: `Stability: ${needWd ? "set withdrawalDate" : ""}${needWd && needClearMfg ? " & " : ""}${needClearMfg ? "clear manufacturingDate" : ""}`,
            typeOfSample: type,
            batchNumber: d.batchNumber,
          });
        }
      } else {
        // Non-stability: ensure manufacturingDate set, withdrawalDate cleared
        const needMfg = mfg === null;
        const needClearWd = wd !== null;

        if (needMfg || needClearWd) {
          toUpdate.push({
            _id: String(d._id),
            set: {
              manufacturingDate: needMfg ? new Date() : mfg, // default now if missing; adjust as needed
              withdrawalDate: null,
              updatedAt: new Date(),
            },
            reason: `Non-stability: ${needMfg ? "set manufacturingDate" : ""}${needMfg && needClearWd ? " & " : ""}${needClearWd ? "clear withdrawalDate" : ""}`,
            typeOfSample: type,
            batchNumber: d.batchNumber,
          });
        }
      }
    }

    // Apply updates (bulkWrite) unless dry run
    let result: any = null;
    if (!dryRun && toUpdate.length > 0) {
      result = await BatchInput.bulkWrite(
        toUpdate.map((u) => ({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: u.set },
          },
        })),
        { ordered: false }
      );
    }

    // Build response
    const nextCursor = docs.length > 0 ? String(docs[docs.length - 1]._id) : null;

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Dry-run preview: ${toUpdate.length} of ${docs.length} in this window would be updated`
        : `Updated ${result?.modifiedCount || 0} of ${docs.length} in this window`,
      windowSize: docs.length,
      wouldUpdate: toUpdate.length,
      updatedCount: dryRun ? 0 : result?.modifiedCount || 0,
      dryRun,
      nextCursor,
      sampleChanges: toUpdate.slice(0, 10).map((u) => ({
        _id: u._id,
        batchNumber: u.batchNumber,
        typeOfSample: u.typeOfSample,
        set: u.set,
        reason: u.reason,
      })),
    });
  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { success: false, message: "Migration failed", error: err?.message },
      { status: 500 }
    );
  }
}
