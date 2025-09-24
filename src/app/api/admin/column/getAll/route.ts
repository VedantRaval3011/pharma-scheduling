import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Column from "@/models/column";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Make from "@/models/make";
import { PrefixSuffix } from '@/models/PrefixSuffix';

// Updated interface with pH range fields
interface IDescription {
  descriptionId: mongoose.Types.ObjectId;
  prefixId?: mongoose.Types.ObjectId | null;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId?: mongoose.Types.ObjectId | null;
  makeId: mongoose.Types.ObjectId;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
  // NEW optional fields - pH range instead of single value
  description?: string;
  phMin?: number | null;
  phMax?: number | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyId = req.nextUrl.searchParams.get("companyId");
    const locationId = req.nextUrl.searchParams.get("locationId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Fetch columns without population
    const columns = await Column.find({ companyId, locationId })
      .sort({
        columnCode: 1,
      });

    // Collect all unique IDs for batch fetching
    const makeIds = new Set<string>();
    const prefixIds = new Set<string>();
    const suffixIds = new Set<string>();

    columns.forEach(column => {
      column.descriptions.forEach((desc: any) => {
        if (desc.makeId) makeIds.add(desc.makeId.toString());
        if (desc.prefixId) prefixIds.add(desc.prefixId.toString());
        if (desc.suffixId) suffixIds.add(desc.suffixId.toString());
      });
    });

    // Batch fetch all related data
    const [makes, prefixSuffixes] = await Promise.all([
      Make.find({ _id: { $in: Array.from(makeIds) } }).lean(),
      PrefixSuffix.find({ 
        _id: { $in: [...Array.from(prefixIds), ...Array.from(suffixIds)] } 
      }).lean()
    ]);

    // Create lookup maps for fast access
    const makeMap = new Map(makes.map(make => [(make._id as mongoose.Types.ObjectId).toString(), make]));
    const prefixSuffixMap = new Map(prefixSuffixes.map(ps => [(ps._id as mongoose.Types.ObjectId).toString(), ps]));

    // Ensure all descriptions have descriptionId and update if needed
    const updatedColumns = await Promise.all(
      columns.map(async (column) => {
        let needsUpdate = false;
        const updatedDescriptions = column.descriptions.map((desc: any) => {
          if (!desc.descriptionId) {
            desc.descriptionId = new mongoose.Types.ObjectId();
            needsUpdate = true;
            console.log(
              `Generated new descriptionId for column ${column.columnCode}:`,
              desc.descriptionId
            );
          }
          return desc;
        });

        if (needsUpdate) {
          column.descriptions = updatedDescriptions;
          column.markModified("descriptions");
          await column.save();
          console.log(
            `Updated column ${column.columnCode} with missing descriptionIds`
          );
        }

        return column;
      })
    );

    // Transform the response to ensure descriptionId is properly included
    const transformedColumns = updatedColumns.map((column) => {
      const columnObj = column.toObject();

      // Force generate and save descriptionId for any descriptions that don't have it
      let needsResave = false;
      columnObj.descriptions = columnObj.descriptions.map((desc: any) => {
        // Generate descriptionId if missing
        if (!desc.descriptionId) {
          desc.descriptionId = new mongoose.Types.ObjectId();
          needsResave = true;
          console.log(`Force generating descriptionId: ${desc.descriptionId}`);
        }

        // Manually join related data
        const make = desc.makeId ? makeMap.get(desc.makeId.toString()) : null;
        const prefix = desc.prefixId ? prefixSuffixMap.get(desc.prefixId.toString()) : null;
        const suffix = desc.suffixId ? prefixSuffixMap.get(desc.suffixId.toString()) : null;

        return {
          descriptionId: desc.descriptionId, // Explicitly include descriptionId
          prefixId: desc.prefixId ? {
            _id: desc.prefixId,
            name: prefix?.name || null
          } : null,
          carbonType: desc.carbonType,
          linkedCarbonType: desc.linkedCarbonType,
          innerDiameter: desc.innerDiameter,
          length: desc.length,
          particleSize: desc.particleSize,
          suffixId: desc.suffixId ? {
            _id: desc.suffixId,
            name: suffix?.name || null
          } : null,
          makeId: desc.makeId ? {
            _id: desc.makeId,
            make: make?.make || null,
            description: make?.description || null
          } : null,
          columnId: desc.columnId,
          installationDate: desc.installationDate,
          usePrefix: desc.usePrefix,
          useSuffix: desc.useSuffix,
          usePrefixForNewCode: desc.usePrefixForNewCode,
          useSuffixForNewCode: desc.useSuffixForNewCode,
          isObsolete: desc.isObsolete,
          // NEW optional fields - pH range with proper null handling
          description: desc.description || null,
          phMin: desc.phMin || null,
          phMax: desc.phMax || null,
        };
      });

      // If we had to generate new descriptionIds, save the document
      if (needsResave) {
        // Update the actual document in the database
        Column.findByIdAndUpdate(
          column._id,
          {
            descriptions: columnObj.descriptions.map((d: any) => ({
              ...d,
              descriptionId: d.descriptionId,
            })),
          },
          { new: true }
        ).catch((err) =>
          console.error("Failed to update descriptionIds:", err)
        );
      }

      return columnObj;
    });

    return NextResponse.json({ success: true, data: transformedColumns });
  } catch (error: any) {
    console.error("GET /api/admin/columns-simple error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}