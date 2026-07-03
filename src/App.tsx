import React, { useEffect, useState } from 'react';
import { auth, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TechTree } from './components/TechTree';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDevsMode, setIsDevsMode] = useState(() => {
    return localStorage.getItem('pirate_rts_devs_mode') === 'true';
  });
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'devs' && password === '1212') {
      setIsDevsMode(true);
      localStorage.setItem('pirate_rts_devs_mode', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    if (isDevsMode) {
      setIsDevsMode(false);
      localStorage.removeItem('pirate_rts_devs_mode');
      setUsername('');
      setPassword('');
    } else {
      logout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c141d] flex flex-col items-center justify-center font-serif text-[#e2d5c3]">
        <p className="text-xl animate-pulse uppercase tracking-widest text-[#f0d0a0]">Loading...</p>
      </div>
    );
  }

  if (!user && !isDevsMode) {
    return (
      <div className="min-h-screen bg-[#0c141d] flex flex-col items-center justify-center font-sans text-[#e2d5c3] p-4 relative overflow-hidden">
        <div className="bg-[#1e1915] p-10 rounded-3xl shadow-2xl border border-[#3d2f1e] max-w-sm w-full text-center relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#b58e3d] flex items-center justify-center rounded-xl mb-6 shadow-sm border border-[#f0d0a0]/30">
            <div className="text-black font-bold text-xl">☠</div>
          </div>
          <h1 className="text-2xl font-bold text-[#f0d0a0] mb-2 uppercase tracking-widest">Pirate RTS</h1>
          <h2 className="text-xs font-bold text-[#8b7d6b] mb-10 uppercase tracking-widest opacity-80">Tech Tree Builder</h2>
          
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a140f] border border-[#3d2f1e] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#b58e3d] transition-colors text-[#e2d5c3]"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a140f] border border-[#3d2f1e] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#b58e3d] transition-colors text-[#e2d5c3]"
            />
            {loginError && <p className="text-red-500 text-xs text-left">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-[#b58e3d] hover:bg-[#d4ac5d] text-[#1e1915] font-bold py-3.5 px-6 rounded-xl uppercase text-xs tracking-widest transition-colors shadow-lg mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen w-full flex flex-col bg-[#0c141d] text-[#e2d5c3] font-sans overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="h-16 bg-[#0c141d] border-b border-[#1a2430] flex items-center justify-between px-8 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#b58e3d] flex items-center justify-center rounded-lg border border-[#f0d0a0]/30 shadow-sm">
            <div className="text-black font-bold text-sm">☠</div>
          </div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-[#f0d0a0] opacity-90 hidden sm:block">Pirate Tech Tree</h1>
        </div>
        
        <div className="flex gap-6 items-center text-sm">
          <div className="flex gap-4 items-center">
            <div className="text-xs font-medium text-[#8b7d6b] flex items-center gap-2">
              <span className="uppercase tracking-widest">{isDevsMode ? 'Devs (Shared Account)' : user?.displayName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[#5c6575] hover:text-[#f0d0a0] transition-colors"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 relative cursor-crosshair">
        <TechTree isDevsMode={isDevsMode} />
      </main>

      <footer className="h-12 bg-[#0c141d] border-t border-[#1a2430] flex items-center justify-between px-8 text-[10px] font-sans tracking-widest uppercase text-[#5c6575] z-20 shrink-0">
        <div className="flex gap-8 hidden sm:flex">
          <span>[RMB] Create/Edit</span>
          <span>[DOUBLE CLICK] Connect</span>
          <span>[MMB / SCROLL] Pan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2a9d8f] animate-pulse"></span>
          SYNCED TO CLOUD
        </div>
      </footer>
    </div>
  );
}

