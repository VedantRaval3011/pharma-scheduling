import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { HPLCSchedule, ScheduledTest, BatchItem } from '@/types/interfaces'
import { DraggableTestRow } from './DraggableTestRow';

interface DroppableHPLCContainerProps {
  schedule: HPLCSchedule;
  batchData: BatchItem[];
  apiMaster: Record<string, string>;
  columnMaster: Record<string, string>;
  setSelectedTestForCalculation: (test: ScheduledTest) => void;
  getDetectorName: (value?: string) => string;
  isDraggedOver: boolean;
}

export const DroppableHPLCContainer: React.FC<DroppableHPLCContainerProps> = ({
  schedule,
  batchData,
  apiMaster,
  columnMaster,
  setSelectedTestForCalculation,
  getDetectorName,
  isDraggedOver,
}) => {
  const { setNodeRef } = useDroppable({
    id: schedule.hplcId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${
        isDraggedOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
    >
      {/* HPLC Header */}
      <div className="p-2 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-gray-800 text-xs font-medium">{schedule.hplcName}</div>
            <div className="text-xs text-gray-500">
              {schedule.tests.length} tests • {formatTime(schedule.totalTime)}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-500">Column</div>
            {schedule.tests.length > 0 && columnMaster[schedule.tests[0]?.columnCode] && (
              <div className="text-[10px] text-gray-600 truncate max-w-[200px]" 
                   title={columnMaster[schedule.tests[0]?.columnCode]}>
                {columnMaster[schedule.tests[0]?.columnCode]}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs text-gray-500">
            Detector: <span className="text-gray-800">
              {schedule.tests.length > 0 ? getDetectorName(schedule.tests[0].detectorTypeId) : 'NA'}
            </span>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="flex-1 overflow-auto">
        {schedule.tests.length > 0 ? (
          <SortableContext
            items={schedule.tests.map(test => test.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200 w-12">Sr No.</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Product Name</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Product Code</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">MFC Number</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">API Name</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Pharmacopoeial</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Type of Sample</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Mobile Phases</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Washes</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Batch</th>
                  <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">Test</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Pri</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sample Inj</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Std Inj</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Blank Inj</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sys Suit</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sens</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Placebo</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Ref1</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Ref2</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Bracket Freq</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Run Time</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Blank RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Std RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sample RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sys Suit RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Sens RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Placebo RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Ref1 RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Ref2 RT</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Wash Time</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Time</th>
                  <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedule.tests.map((test, index) => (
                  <DraggableTestRow
                    key={test.id}
                    test={test}
                    index={index}
                    batchData={batchData}
                    apiMaster={apiMaster}
                    columnMaster={columnMaster}
                    setSelectedTestForCalculation={setSelectedTestForCalculation}
                    getDetectorName={getDetectorName}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        ) : (
          <div className="p-3 text-center text-gray-500 text-xs min-h-[100px] flex items-center justify-center border-2 border-dashed border-gray-300 m-2 rounded">
            Drop tests here or no tests assigned
          </div>
        )}
      </div>

      {/* Groups Summary */}
      {schedule.groups.length > 0 && (
        <div className="border-t border-gray-200 bg-green-50 p-2">
          <div className="text-[10px] text-green-600">
            {schedule.groups.length} optimization group{schedule.groups.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to format time
const formatTime = (minutes: number): string => {
  const roundedMinutes = parseFloat(minutes.toFixed(1));
  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = (roundedMinutes % 60).toFixed(1);
    return remainingMinutes === '0.0' 
      ? `${hours} hour${hours !== 1 ? 's' : ''}` 
      : `${hours}h ${remainingMinutes}m`;
  }
  return `${roundedMinutes} min`;
};
