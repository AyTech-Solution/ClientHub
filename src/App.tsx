import { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { signInWithPopup, GithubAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

const GITHUB_APP_SLUG = "aytech-clienthub"; // Yahan apne GitHub App ka slug daalna

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. URL check: Kya user install karke wapas aaya hai?
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('installation_id')) {
      setIsInstalled(true);
    }

    // 2. Firebase Auth monitor
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGitHubLogin = async () => {
    const provider = new GithubAuthProvider();
    provider.addScope('repo'); // Agar aapko repo access chahiye
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("GitHub Login Failed:", err);
    }
  };

  const handleInstall = () => {
    // Redirect user to GitHub App installation page
    window.location.href = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsInstalled(false);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading Portal...
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl text-center">
      
      {!user ? (
        // SCENE 1: Not Logged In
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">ClientHub Portal</h2>
          <p className="text-gray-400 text-sm mb-6">Login with GitHub to manage projects</p>
          <button 
            onClick={handleGitHubLogin} 
            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition shadow-lg"
          >
            Login with GitHub
          </button>
        </div>
      ) : !isInstalled ? (
        // SCENE 2: Logged In but Not Installed
        <div className="space-y-4">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-bold text-white">Welcome, {user.displayName || 'Developer'}</h2>
          <p className="text-gray-400 text-sm mb-6">Authorize your GitHub account to sync pipelines.</p>
          <button 
            onClick={handleInstall} 
            className="w-full py-3 bg-[#58a6ff] text-white font-bold rounded-lg hover:bg-[#388bfd] transition"
          >
            Install App on GitHub
          </button>
          <button onClick={handleLogout} className="text-xs text-gray-600 hover:text-red-400 underline mt-4">
            Sign out
          </button>
        </div>
      ) : (
        // SCENE 3: Logged In AND Installed (Success)
        <div className="space-y-4 animate-fade-in">
          <div className="w-16 h-16 bg-green-900/30 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-white">All Set!</h2>
          <p className="text-green-400 font-medium">System successfully integrated.</p>
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] text-left text-xs text-gray-400">
            <p>User: {user.email}</p>
            <p>Status: Active Pipeline</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-600 hover:text-red-400 underline mt-4">
            Disconnect Account
          </button>
        </div>
      )}
    </div>
  );
}
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
