import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Plus, Trash2, CheckCircle2, Circle, GripVertical } from 'lucide-react';

export type TaskCategory = 'models' | 'code';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: TaskCategory;
}

export function Checklist() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTexts, setNewTaskTexts] = useState<Record<TaskCategory, string>>({
    models: '',
    code: ''
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Load from Firebase
  useEffect(() => {
    const docRef = doc(db, 'checklists', 'global_shared');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tasks) {
          try {
            const parsed = JSON.parse(data.tasks);
            // Migrate old tasks without category to 'code'
            const migrated = parsed.map((t: any) => ({
              ...t,
              category: t.category || 'code'
            }));
            setTasks(migrated);
          } catch (e) {
            console.error("Failed to parse tasks");
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checklists/global_shared');
    });

    return () => unsubscribe();
  }, []);

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    const docRef = doc(db, 'checklists', 'global_shared');
    setDoc(docRef, { tasks: JSON.stringify(updatedTasks) }).catch((error) => {
      handleFirestoreError(error, OperationType.UPDATE, 'checklists/global_shared');
    });
  };

  const handleAddTask = (e: React.FormEvent, category: TaskCategory) => {
    e.preventDefault();
    const text = newTaskTexts[category];
    if (!text.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      category,
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    setNewTaskTexts(prev => ({ ...prev, [category]: '' }));
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    saveTasks(updatedTasks);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null, targetCategory: TaskCategory) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('text/plain');
    if (!draggedTaskId || draggedTaskId === targetId) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    if (draggedIndex === -1) return;

    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    
    // Update category if dropped into a different list
    draggedTask.category = targetCategory;

    if (targetId) {
      const targetIndex = newTasks.findIndex(t => t.id === targetId);
      newTasks.splice(targetIndex, 0, draggedTask);
    } else {
      // Append to the end of the category
      newTasks.push(draggedTask);
    }

    saveTasks(newTasks);
    setDraggedId(null);
  };

  const renderCategory = (category: TaskCategory, title: string) => {
    const categoryTasks = tasks.filter(t => t.category === category);
    
    return (
      <div 
        className="flex-1 bg-[#1e1915] border border-[#3d2f1e] rounded-3xl p-6 shadow-2xl flex flex-col h-full"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null, category)}
      >
        <h2 className="text-xl font-bold text-[#f0d0a0] uppercase tracking-widest mb-6">{title}</h2>
        
        <form onSubmit={(e) => handleAddTask(e, category)} className="flex gap-4 mb-6">
          <input
            type="text"
            value={newTaskTexts[category]}
            onChange={(e) => setNewTaskTexts(prev => ({ ...prev, [category]: e.target.value }))}
            placeholder="Add a new task..."
            className="flex-1 bg-[#0c141d] border border-[#3d2f1e] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#b58e3d] transition-colors text-[#e2d5c3]"
          />
          <button
            type="submit"
            disabled={!newTaskTexts[category].trim()}
            className="bg-[#b58e3d] hover:bg-[#d4ac5d] disabled:opacity-50 disabled:hover:bg-[#b58e3d] text-[#1e1915] font-bold p-3 rounded-xl transition-colors shrink-0"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[200px]">
          {categoryTasks.length === 0 ? (
            <p className="text-center text-[#8b7d6b] py-8 text-sm uppercase tracking-widest opacity-50">Drop tasks here</p>
          ) : (
            categoryTasks.map(task => (
              <div 
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, task.id, category);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  draggedId === task.id ? 'opacity-50 border-[#b58e3d]' : ''
                } ${
                  task.completed 
                    ? 'bg-[#1a2a36]/30 border-[#2a9d8f]/30' 
                    : 'bg-[#0c141d] border-[#3d2f1e] hover:border-[#b58e3d]/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="cursor-grab active:cursor-grabbing text-[#5c6575] hover:text-[#f0d0a0] transition-colors p-1 -ml-1">
                    <GripVertical size={16} />
                  </div>
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed ? (
                      <CheckCircle2 size={18} className="text-[#2a9d8f] shrink-0" />
                    ) : (
                      <Circle size={18} className="text-[#8b7d6b] shrink-0" />
                    )}
                    <span className={`text-sm select-none ${task.completed ? 'text-gray-500 line-through' : 'text-[#e2d5c3]'}`}>
                      {task.text}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-[#5c6575] hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 p-6 md:p-8 overflow-y-auto">
      {renderCategory('models', 'Создание моделей')}
      {renderCategory('code', 'Написание кода')}
    </div>
  );
}

