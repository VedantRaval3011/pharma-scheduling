import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }
    
    const chemicalsCollection = db.collection('chemicals');

    // Original data mapping: chemicalName -> desc string
    const originalData: Record<string, string> = {
      "1-HEXANE SULFONATE SODIUM": "SODIUM HEXANESULFONATE, SODIUM N-HEXANESULFONATE",
      "1-OCTANESULPHONATE SODIUM MONOHYDRATE": "SODIUM OCTANESULFONATE, SODIUM 1-OCTANESULFONATE",
      "ACETIC ACID": "GLACIAL ACETIC ACID",
      "ACETONITRILE": "METHYL CYANIDE, ETHYL NITRILE, CYANOMETHANE",
      "AMMONIUM ACETATE": "ACETIC ACID AMMONIUM SALT",
      "AMMONIUM CHLORIDE": "SAL AMMONIAC, AMCHLOR",
      "AMMONIUM DIHYDROGEN PHOSPHATE": "MONOAMMONIUM PHOSPHATE (MAP), AMMONIUM BIPHOSPHATE",
      "AMMONIUM FORMATE": "AMMONIUM FORMATE",
      "AMMONIUM OXALATE": "ETHANEDIOIC ACID DIAMMONIUM SALT",
      "AMMONIUM SULFATE": "AMMONIUM SULFATE",
      "ANHYDROUS AMMONIUM SULPHATE": "AMMONIUM SULFATE, DIAMMONIUM SULFATE",
      "ANHYDROUS SODIUM ACETATE": "SODIUM ETHANOATE",
      "BORAX": "SODIUM TETRABORATE DECAHYDRATE, SODIUM BORATE",
      "BORIC ACID": "HYDROGEN BORATE, ORTHOBORIC ACID, BORACIC ACID",
      "CITRIC ACID": "2-HYDROXY-1,2,3-PROPANE-TRICARBOXYLIC ACID",
      "DEXTROSE": "D-GLUCOSE",
      "DIBASIC AMMONIUM PHOSPHATE": "DIAMMONIUM HYDROGEN PHOSPHATE (DAP)",
      "DIBASIC SODIUM PHOSPHATE": "DISODIUM HYDROGEN PHOSPHATE, DSP",
      "DIMETHYL FORMAMIDE": "N,N-DIMETHYLFORMAMIDE",
      "DIOCTYL SODIUM SULPHOSUCCINATE": "DOSS, AOT, AEROSOL OT",
      "DIPOTASSIUM HYDROGEN PHOSPHATE": "DIPOTASSIUM PHOSPHATE, K₂HPO₄",
      "DISODIUM AMMONIUM PHOSPHATE": "AMMONIUM DISODIUM PHOSPHATE",
      "DISODIUM HYDROGEN PHOSPHATE": "DISODIUM PHOSPHATE, NA₂HPO₄",
      "GLACIAL ACETIC ACID": "ACETIC ACID, ANHYDROUS ACETIC ACID",
      "HPLC WATER": "DISTILLED WATER",
      "HYDROCHLORIC ACID": "MURIATIC ACID,HCL",
      "METHANOL": "METHYL ALCOHOL",
      "MONOBASIC SODIUM DIHYDROGEN ORTHOPHOSPHATE": "SODIUM DIHYDROGEN PHOSPHATE , (NAH₂PO₄)",
      "MYRISTYLTRIMETHYLAMMONIUM BROMIDE": "CETRIMIDE",
      "ORTHOPHOSPHORIC ACID": "PHOSPHORIC ACID, H₃PO₄,OPA",
      "PERCHLORIC ACID": "HClO₄, HYPERCHLORIC ACID",
      "POTASSIUM CHLORIDE": "KCL",
      "POTASSIUM DIHYDROGEN PHOSPHATE": "MONOPOTASSIUM PHOSPHATE ,(KH₂PO₄)",
      "POTASSIUM HYDROGEN ORTHOPHOSPHATE": "DIPOTASSIUM PHOSPHATE ,(K₂HPO₄)",
      "POTASSIUM HYDROXIDE": "KOH",
      "SODIUM ACETATE": "SODIUM ACETATE ANHYDROUS",
      "SODIUM CARBONATE": "NA₂CO₃",
      "SODIUM DI-HYDROGEN ORTHO PHOSPHATE ANHYDROUS": "NAH₂PO₄",
      "SODIUM DIHYDROGEN PHOSPHATE": "NAH₂PO₄, MONOSODIUM PHOSPHATE",
      "SODIUM DODECYL SULFATE": "SODIUM LAURYL SULFATE,  (SLS)",
      "SODIUM HEPTANE SULFONATE SODIUM SALT": "SODIUM HEPTANESULFONATE",
      "SODIUM HYDROGEN CARBONATE": "SODIUM BICARBONATE ,(NAHCO₃)",
      "SODIUM HYDROXIDE": "NAOH",
      "SODIUM PERCHLORATE": "NACL0₄,SODIUM PERCHLORATE MONOHYDRATE",
      "SODIUM PHOSPHATE MONOBASIC": "SODIUM DIHYDROGEN PHOSPHATE (NAH₂PO₄)",
      "SODIUM SULPHATE": "NA₂SO₄",
      "SULFURIC ACID": "H₂SO₄",
      "TETRABUTYL AMMONIUM PHOSPHATE SOLUTION": "TBAP",
      "TETRAHYDROFURAN": "THF",
      "TRIETHYLAMINE": "TEA, N,N-DIETHYLETHANAMINE",
      "TRIFLUOROACETIC ACID": "TRIFLUOROETHANOIC ACID",
      "TRIS (HYDROXYMETHYL) AMINOMETHANE": "TRIS BUFFER, TROMETHAMINE",
      "WATER": "WATER"
    };

    let successCount = 0;
    let errorCount = 0;
    const migrationLog: any[] = [];

    for (const [chemicalName, descString] of Object.entries(originalData)) {
      try {
        // Split by comma and create array
        const descArray = descString
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0 && item.length <= 200);

        // Remove duplicates (case-insensitive)
        const uniqueDesc = Array.from(new Set(
          descArray.map(d => d.toLowerCase())
        )).map(lower => 
          descArray.find(d => d.toLowerCase() === lower) || ''
        ).filter(d => d);

        // Update the chemical
        const result = await chemicalsCollection.updateOne(
          { chemicalName: chemicalName },
          { 
            $set: { 
              desc: uniqueDesc,
              updatedAt: new Date()
            } 
          }
        );

        if (result.modifiedCount > 0) {
          successCount++;
          migrationLog.push({
            chemicalName,
            oldDesc: descString,
            newDesc: uniqueDesc
          });
          console.log(`✓ Restored: ${chemicalName} -> [${uniqueDesc.join(', ')}]`);
        }
      } catch (err: any) {
        errorCount++;
        console.error(`✗ Error restoring ${chemicalName}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Restore completed: ${successCount} successful, ${errorCount} failed`,
      details: {
        totalProcessed: Object.keys(originalData).length,
        successCount,
        errorCount,
        migrationLog: migrationLog.slice(0, 10)
      }
    });

  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
