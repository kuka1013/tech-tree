import { useState, useEffect } from 'react';
import { TechNodeData } from '../types';

interface NodeEditorModalProps {
  isOpen: boolean;
  initialData: TechNodeData | null;
  onSave: (data: TechNodeData) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export function NodeEditorModal({ isOpen, initialData, onSave, onClose, onDelete }: NodeEditorModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price || '');
    } else {
      setTitle('');
      setDescription('');
      setPrice('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ title, description, price });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c141d]/80 backdrop-blur-sm">
      <div className="bg-[#1e1915] border border-[#3d2f1e] p-8 rounded-3xl shadow-2xl max-w-sm w-full font-sans text-[#f0d0a0]">
        <div className="text-[#b58e3d] text-xs font-bold uppercase mb-6 tracking-[0.2em] border-b border-[#3d2f1e] pb-3 text-center">
          {initialData?.title ? 'Edit Technology' : 'Node Configurator'}
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="text-[10px] text-[#8b7d6b] block mb-1.5 uppercase tracking-widest">Research Name</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#0c141d] border border-[#3d2f1e] rounded-xl p-3 text-sm outline-none text-[#f0d0a0] focus:border-[#b58e3d] transition-colors"
              placeholder="e.g. Hull Reinforcement"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8b7d6b] block mb-1.5 uppercase tracking-widest">Brief Log Entry</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#0c141d] border border-[#3d2f1e] rounded-xl p-3 text-xs h-24 outline-none text-[#f0d0a0] resize-none focus:border-[#b58e3d] transition-colors"
              placeholder="e.g. Double the planks..."
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8b7d6b] block mb-1.5 uppercase tracking-widest">Resource Cost</label>
            <input 
              type="text" 
              value={price} 
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-[#0c141d] border border-[#3d2f1e] rounded-xl p-3 text-sm outline-none text-[#f0d0a0] focus:border-[#b58e3d] transition-colors"
              placeholder="e.g. 750 Gold"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button 
            onClick={handleSave}
            className="w-full py-3 bg-[#b58e3d] text-[#1e1915] rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#d4ac5d] transition-colors shadow-lg"
          >
            Seal Document
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#3d2f1e] text-[#8b7d6b] font-bold uppercase text-[10px] tracking-widest hover:bg-[#3d2f1e] transition-colors"
            >
              Cancel
            </button>
            {onDelete && (
              <button 
                onClick={onDelete}
                className="flex-1 py-3 rounded-xl border border-[#7a0000] text-[#7a0000] font-bold uppercase text-[10px] tracking-widest hover:bg-[#7a0000]/20 transition-colors"
              >
                Discard Progress
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
