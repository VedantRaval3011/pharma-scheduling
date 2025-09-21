import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calculator } from 'lucide-react';
import { ScheduledTest, BatchItem } from '@/types/interfaces';

interface DraggableTestRowProps {
  test: ScheduledTest;
  index: number;
  batchData: BatchItem[];
  apiMaster: Record<string, string>;
  columnMaster: Record<string, string>;
  setSelectedTestForCalculation: (test: ScheduledTest) => void;
  getDetectorName: (value?: string) => string;
}

const DragHandle: React.FC = () => (
  <div className="flex flex-col items-center justify-center cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors">
    <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5"></div>
    <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5"></div>
    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
  </div>
);

export const DraggableTestRow: React.FC<DraggableTestRowProps> = ({
  test,
  index,
  batchData,
  apiMaster,
  columnMaster,
  setSelectedTestForCalculation,
  getDetectorName,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: test.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Find batch data for this test
  const batch = batchData.find(b => b.id === test.batchId);
  
  // Calculate API name
  let apiName = 'NA';
  if (batch?.generics && test.originalTest) {
    for (const generic of batch.generics) {
      for (const api of generic.apis) {
        const matchingTest = api.testTypes.find(testType => 
          testType.testName === test.originalTest?.testName &&
          testType.columnCode === test.originalTest?.columnCode &&
          testType.detectorTypeId === test.originalTest?.detectorTypeId
        );
        if (matchingTest) {
          apiName = apiMaster[api.apiName] || api.apiName || 'NA';
          break;
        }
      }
      if (apiName !== 'NA') break;
    }
  }

  // Mobile phases and washes
  const mobilePhases = test.mobilePhaseCodes
    .slice(0, 4)
    .filter(code => code && code !== '')
    .join(', ');
  
  const washes = test.mobilePhaseCodes
    .slice(4)
    .filter(code => code && code !== '')
    .join(', ');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${test.isGrouped ? 'bg-green-50' : ''} hover:bg-gray-50 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
    >
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200 w-12">
        <div className="flex items-center gap-1">
          <div {...listeners} title="Drag to reorder">
            <DragHandle />
          </div>
          <span className="text-xs">{index + 1}</span>
        </div>
      </td>
      
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="font-medium truncate w-20" title={test.productName}>
          {test.productName}
        </div>
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200" title={test.productCode}>
        {test.productCode}
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200" title={batch?.mfcNumber}>
        {batch?.mfcNumber || 'NA'}
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200" title={apiName}>
        {apiName}
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200" title={batch?.pharmacopoeialName}>
        {batch?.pharmacopoeialName || 'NA'}
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200" title={batch?.typeOfSample}>
        {batch?.typeOfSample || 'NA'}
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        <span title={mobilePhases}>{mobilePhases || 'NA'}</span>
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        <span title={washes}>{washes || 'NA'}</span>
      </td>
      
      <td className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200" title={test.batchNumber}>
        {test.batchNumber}
      </td>
      
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="font-medium truncate w-20" title={test.testName}>
          {test.testName}
        </div>
        {test.isGrouped && (
          <div className="text-[10px] text-green-600 truncate" title={test.groupReason}>
            Grouped
          </div>
        )}
      </td>
      
      <td className="px-1 py-1 text-center border-r border-gray-200">
        <span className={`inline-block px-1 text-[10px] font-medium rounded ${
          test.priority.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-600' :
          test.priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-600' :
          test.priority.toLowerCase() === 'normal' ? 'bg-green-100 text-green-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          {test.priority.charAt(0)}
        </span>
      </td>
      
      {/* Injection columns */}
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sampleInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.standardInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.blankInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.systemSuitability || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sensitivity || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.placebo || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference1 || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference2 || 0}
      </td>
      
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.bracketingFrequency || 0}
      </td>
      
      {/* Runtime columns */}
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.runTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.blankRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.standardRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sampleRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.systemSuitabilityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sensitivityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.placeboRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference1RunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference2RunTime || 0}m
      </td>
      
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.washTime || 0}m
      </td>
      
      {/* Execution time */}
      <td className="px-1 py-1 text-center text-gray-700 border-r border-gray-200">
        <div className="text-[10px]">
          {test.executionTime.toFixed(0)}m
        </div>
        {test.isGrouped && test.timeSaved && (
          <div className="text-[10px] text-green-600">
            -{test.timeSaved.toFixed(0)}m
          </div>
        )}
      </td>
      
      {/* Action button */}
      <td className="px-1 py-1 text-center border-r border-gray-200">
        <button
          onClick={() => setSelectedTestForCalculation(test)}
          className="text-blue-500 hover:text-blue-600 text-[10px] p-1"
          title="View calculation details"
        >
          <Calculator className="w-2 h-2" />
        </button>
      </td>
    </tr>
  );
};
