import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

const GITHUB_APP_SLUG = "aytech-clienthub"; 
const INSTAGRAM_URL = "https://instagram.com/aytech_solution";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check GitHub installation_id inside URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('installation_id')) {
      setIsInstalled(true);
    }

    // Monitor Firebase Auth State
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password.");
    }
  };

  const handleLogout = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setIsInstalled(false);
    signOut(auth);
  };

  const handleGitHubRedirect = () => {
    window.location.href = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58a6ff]"></div>
        <p className="text-gray-400 text-sm">Initializing ClientHub Systems...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl relative overflow-hidden">
      
      {/* 1. NOT LOGGED IN - Login Screen */}
      {!user && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">AyTech ClientHub</h2>
            <p className="text-gray-400 text-sm">Secure Portal Login</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-[#58a6ff] transition" 
              placeholder="dev@aytech.in"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-[#58a6ff] transition" 
              placeholder="••••••••"
              required 
            />
          </div>
          {authError && <p className="text-red-400 text-xs mt-1">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-lg transition mt-4 shadow-md">
            Verify Credentials
          </button>
        </form>
      )}

      {/* 2. LOGGED IN but App NOT Installed */}
      {user && !isInstalled && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-[#21262d] border border-[#30363d] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">App Integration Pending</h2>
          <p className="text-xs text-gray-400 mb-6">Authenticated as: <span className="text-gray-300 font-medium">{user.email}</span></p>
          
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-left text-sm text-gray-300 space-y-2 mb-6">
            <p className="flex items-center text-xs text-gray-400"><span class="w-1.5 h-1.5 bg-[#58a6ff] rounded-full mr-2"></span> Setup target sync pipelines.</p>
            <p className="flex items-center text-xs text-gray-400"><span class="w-1.5 h-1.5 bg-[#58a6ff] rounded-full mr-2"></span> Configure workspace structures.</p>
          </div>

          <button onClick={handleGitHubRedirect} className="w-full py-3 bg-[#58a6ff] hover:bg-[#388bfd] text-[#0d1117] font-bold rounded-lg transition mb-4 shadow-md">
            Integrate App on GitHub
          </button>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition underline block mx-auto">Sign Out</button>
        </div>
      )}

      {/* 3. LOGGED IN and App INSTALLED - Thank You Page */}
      {user && isInstalled && (
        <div className="text-center py-4 animate-fade-in">
          <div className="w-16 h-16 bg-[#238636]/10 border border-[#238636] rounded-full flex items-center justify-center mx-auto mb-4 text-[#2ea043]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Thank You!</h2>
          <p className="text-sm text-[#58a6ff] mb-6 font-medium">App Installed Successfully</p>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-5 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center border-b border-[#30363d] pb-2">
              <span className="text-xs text-gray-400 uppercase font-semibold">System Pipeline</span>
              <span className="text-xs bg-[#238636]/20 text-[#58a6ff] px-2 py-0.5 rounded border border-[#238636]/30 font-mono">ACTIVE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              ClientHub engine is now running securely. Real-time webhooks, issue tracking matrices, and Firebase listeners are fully operating on **Render**.
            </p>
          </div>

          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="w-full py-3 bg-[#161b22] hover:bg-[#30363d] border border-[#30363d] text-white font-medium rounded-lg transition flex items-center justify-center space-x-2 mb-4">
            <span>Support & Enquiries via AyTech</span>
          </a>

          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition underline block mx-auto">Disconnect Portal Account</button>
        </div>
      )}

    </div>
  );
}
