import { Series } from "@/models/Series";
import { getCurrentCompanyAndLocation } from "./session";
import connectDB from "./db";

export async function generateNextNumber(seriesId: string): Promise<string> {
  await connectDB();
  const { companyId, locationId } = await getCurrentCompanyAndLocation();
  
  const series = await Series.findOne({ _id: seriesId, companyId, locationId });
  if (!series) {
    throw new Error('Series not found');
  }

  // Check if reset is needed
  const now = new Date();
  let shouldReset = false;
  
  if (series.resetFrequency !== 'none') {
    const lastUpdate = series.updatedAt;
    if (series.resetFrequency === 'daily' && 
        (now.getDate() !== lastUpdate.getDate() || 
         now.getMonth() !== lastUpdate.getMonth() || 
         now.getFullYear() !== lastUpdate.getFullYear())) {
      shouldReset = true;
    } else if (series.resetFrequency === 'monthly' && 
               (now.getMonth() !== lastUpdate.getMonth() || 
                now.getFullYear() !== lastUpdate.getFullYear())) {
      shouldReset = true;
    } else if (series.resetFrequency === 'yearly' && 
               now.getFullYear() !== lastUpdate.getFullYear()) {
      shouldReset = true;
    }
  }

  let nextNumber = series.currentNumber;
  if (shouldReset) {
    nextNumber = 1;
  } else {
    nextNumber += 1;
  }

  // Update currentNumber
  await Series.findOneAndUpdate(
    { _id: seriesId, companyId, locationId },
    { $set: { currentNumber: nextNumber } }
  );

  // Format number with padding
  const paddedNumber = nextNumber.toString().padStart(series.padding, '0');
  return `${series.prefix}${paddedNumber}${series.suffix}`;
}