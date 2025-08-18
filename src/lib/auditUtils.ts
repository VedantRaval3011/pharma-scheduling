// lib/auditUtils.ts
import MFCAudit from '@/models/mfcAudit';

interface AuditData {
  mfcId: string;
  mfcNumber: string;
  companyId: string;
  locationId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit record for MFC operations
 */
export async function createMFCAuditLog(data: AuditData): Promise<void> {
  try {
    const changes = calculateChanges(data.oldData, data.newData);
    
    const auditRecord = new MFCAudit({
      mfcId: data.mfcId,
      mfcNumber: data.mfcNumber,
      companyId: data.companyId,
      locationId: data.locationId,
      action: data.action,
      performedBy: data.performedBy,
      changes,
      oldData: data.oldData,
      newData: data.newData,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    await auditRecord.save();
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to avoid breaking main operations
  }
}

/**
 * Calculate changes between old and new data
 */
function calculateChanges(oldData?: Record<string, any>, newData?: Record<string, any>) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  if (!oldData && !newData) return changes;

  // For CREATE operations
  if (!oldData && newData) {
    Object.keys(newData).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
        changes.push({
          field: key,
          oldValue: null,
          newValue: newData[key],
        });
      }
    });
    return changes;
  }

  // For DELETE operations
  if (oldData && !newData) {
    Object.keys(oldData).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: null,
        });
      }
    });
    return changes;
  }

  // For UPDATE operations
  if (oldData && newData) {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
        const oldValue = oldData[key];
        const newValue = newData[key];
        
        // Only log if values are actually different
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            field: key,
            oldValue,
            newValue,
          });
        }
      }
    });
  }

  return changes;
}

/**
 * Get audit trail for a specific MFC
 */
export async function getMFCAuditTrail(
  mfcId: string,
  companyId: string,
  locationId: string,
  limit: number = 50
) {
  try {
    return await MFCAudit.find({
      mfcId,
      companyId,
      locationId,
    })
      .sort({ performedAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
}

/**
 * Get audit summary for a date range
 */
export async function getAuditSummary(
  companyId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const summary = await MFCAudit.aggregate([
      {
        $match: {
          companyId,
          locationId,
          performedAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            action: '$action',
            performedBy: '$performedBy',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.action',
          users: {
            $push: {
              user: '$_id.performedBy',
              count: '$count',
            },
          },
          totalCount: { $sum: '$count' },
        },
      },
    ]);

    return summary;
  } catch (error) {
    console.error('Error generating audit summary:', error);
    return [];
  }
}