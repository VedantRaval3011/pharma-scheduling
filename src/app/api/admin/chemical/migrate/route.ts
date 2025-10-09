import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Use direct MongoDB collection to bypass Mongoose schema validation
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const chemicalsCollection = db.collection("chemicals");

    // Find all chemicals where desc is a string
    const chemicalsToMigrate = await chemicalsCollection
      .find({ desc: { $type: "string" } })
      .toArray();

    console.log(`Found ${chemicalsToMigrate.length} chemicals to migrate`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    const migrationLog: any[] = [];

    for (const chemical of chemicalsToMigrate) {
      try {
        let descArray: string[] = [];

        if (chemical.desc && typeof chemical.desc === "string") {
          // Split by comma and clean up each item
          descArray = chemical.desc
            .split(",")
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0 && item.length <= 200);

          // Remove duplicates (case-insensitive)
          const uniqueDesc = Array.from(
            new Set(descArray.map((d) => d.toLowerCase()))
          )
            .map(
              (lower) => descArray.find((d) => d.toLowerCase() === lower) || ""
            )
            .filter((d) => d);

          descArray = uniqueDesc;
        }

        // Update directly using MongoDB collection (bypasses Mongoose validation)
        const result = await chemicalsCollection.updateOne(
          { _id: chemical._id },
          {
            $set: {
              desc: descArray,
              updatedAt: new Date(),
            },
          }
        );

        if (result.modifiedCount > 0) {
          successCount++;
          const logEntry = {
            chemicalName: chemical.chemicalName,
            oldDesc: chemical.desc,
            newDesc: descArray,
          };
          migrationLog.push(logEntry);
          console.log(`✓ Migrated: ${chemical.chemicalName}`);
          console.log(`  Old: "${chemical.desc}"`);
          console.log(`  New: [${descArray.join(", ")}]`);
        }
      } catch (err: any) {
        errorCount++;
        errors.push({
          chemicalName: chemical.chemicalName,
          oldDesc: chemical.desc,
          error: err.message,
        });
        console.error(`✗ Error migrating ${chemical.chemicalName}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${successCount} successful, ${errorCount} failed`,
      details: {
        totalFound: chemicalsToMigrate.length,
        successCount,
        errorCount,
        errors: errorCount > 0 ? errors : [],
        migrationLog: migrationLog.slice(0, 10), // First 10 successful migrations
      },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
