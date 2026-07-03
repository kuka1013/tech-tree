import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export function Checklist() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  // Load from Firebase
  useEffect(() => {
    const docRef = doc(db, 'checklists', 'global_shared');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tasks) {
          setTasks(JSON.parse(data.tasks));
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    setNewTaskText('');
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

  return (
    <div className="w-full h-full flex justify-center p-8 overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#1e1915] border border-[#3d2f1e] rounded-3xl p-8 shadow-2xl h-fit">
        <h2 className="text-2xl font-bold text-[#f0d0a0] uppercase tracking-widest mb-6">Global Tasks</h2>
        
        <form onSubmit={handleAddTask} className="flex gap-4 mb-8">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-[#0c141d] border border-[#3d2f1e] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#b58e3d] transition-colors text-[#e2d5c3]"
          />
          <button
            type="submit"
            disabled={!newTaskText.trim()}
            className="bg-[#b58e3d] hover:bg-[#d4ac5d] disabled:opacity-50 disabled:hover:bg-[#b58e3d] text-[#1e1915] font-bold p-3 rounded-xl transition-colors shrink-0"
          >
            <Plus size={24} />
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <p className="text-center text-[#8b7d6b] py-8 text-sm uppercase tracking-widest">No tasks yet.</p>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  task.completed 
                    ? 'bg-[#1a2a36]/30 border-[#2a9d8f]/30' 
                    : 'bg-[#0c141d] border-[#3d2f1e] hover:border-[#b58e3d]/50'
                }`}
              >
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => toggleTask(task.id)}
                >
                  {task.completed ? (
                    <CheckCircle2 size={20} className="text-[#2a9d8f] shrink-0" />
                  ) : (
                    <Circle size={20} className="text-[#8b7d6b] shrink-0" />
                  )}
                  <span className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-[#e2d5c3]'}`}>
                    {task.text}
                  </span>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-[#5c6575] hover:text-red-400 p-2 transition-colors ml-4"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
