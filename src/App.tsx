import { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { signInWithPopup, GithubAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

const GITHUB_APP_SLUG = "aytech-clienthub"; 

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('installation_id')) {
      setIsInstalled(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGitHubLogin = async () => {
    const provider = new GithubAuthProvider();
    provider.addScope('repo');
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("GitHub Login Failed:", err);
    }
  };

  const handleInstall = () => {
    window.location.href = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsInstalled(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 bg-[#0d1117]">
        Loading Portal...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117] p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl text-center">
        
        {!user ? (
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
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-900/30 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-white">All Set!</h2>
            <p className="text-green-400 font-medium">System successfully integrated.</p>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] text-left text-xs text-gray-400">
              <p>User: {user.email || 'GitHub User'}</p>
              <p>Status: Active Pipeline</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-600 hover:text-red-400 underline mt-4">
              Disconnect Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
              }
