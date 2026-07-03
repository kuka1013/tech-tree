import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { TechNodeData } from '../types';

interface TechNodeProps {
  data: TechNodeData;
  selected?: boolean;
}

export const TechNode = memo(({ data, selected }: TechNodeProps) => {
  return (
    <>
      <NodeResizer 
        color="#b58e3d" 
        isVisible={selected} 
        minWidth={192} 
        minHeight={120} 
        handleClassName="w-3 h-3 rounded-full bg-[#b58e3d] border-2 border-[#1e1915]"
      />
      <div className={`relative p-3 w-full h-full min-w-[192px] min-h-[120px] rounded-3xl flex flex-col justify-center items-center shadow-lg transition-colors duration-300 box-border ${
        selected 
        ? 'bg-[#1a2a36] border-2 border-[#2a9d8f] ring-4 ring-[#2a9d8f]/20' 
        : 'bg-[#1e1915] border border-[#3d2f1e] hover:border-[#b58e3d]/50'
      }`}>
        <Handle 
          type="target" 
          position={Position.Left} 
          id="l"
          className="opacity-0 pointer-events-none absolute left-0" 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          id="r"
          className="opacity-0 pointer-events-none absolute right-0" 
        />

        <div className="flex flex-col gap-1 items-center justify-center text-center w-full h-full overflow-hidden">
          <div className={`text-xs uppercase font-bold tracking-widest w-full shrink-0 break-words line-clamp-2 leading-tight px-1 ${selected ? 'text-[#2a9d8f]' : 'text-[#b58e3d]'}`}>
            {data.title || 'New Tech'}
          </div>
          {data.description && <p className={`text-[10px] opacity-70 shrink-0 line-clamp-2 leading-tight px-1 ${selected ? 'text-gray-300' : 'text-[#8b7d6b]'}`}>{data.description}</p>}
          {data.price && (
            <div className={`mt-auto text-[10px] font-medium px-2 py-1 shrink-0 rounded border ${selected ? 'text-[#2a9d8f] border-[#2a9d8f]/30 bg-[#2a9d8f]/10' : 'text-[#8b7d6b] border-[#3d2f1e] bg-[#0c141d]'}`}>
              Cost: {data.price}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

