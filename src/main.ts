import { auth } from "./firebaseConfig";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const appContainer = document.getElementById("app-container") as HTMLDivElement;
const loadingState = document.getElementById("loading-state") as HTMLDivElement;
const dynamicContent = document.getElementById("dynamic-content") as HTMLDivElement;

// GitHub App configuration details
const GITHUB_APP_SLUG = "aytech-clienthub"; 
const INSTAGRAM_URL = "https://instagram.com/aytech_solution";

// Helper function to render different steps dynamically
function renderScreen(htmlContent: string) {
    loadingState.classList.add("hidden");
    dynamicContent.classList.remove("hidden");
    dynamicContent.innerHTML = htmlContent;
}

// Check URL query parameters to see if user just installed the app
function getInstallationStatus(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has("installation_id");
}

// ---------------- UI Templates ----------------

// 1. Auth View (Login)
function showLoginScreen() {
    const html = `
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-white mb-2">AyTech ClientHub</h2>
            <p class="text-gray-400 text-sm">Secure Portal Login</p>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <input type="email" id="auth-email" class="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-[#58a6ff] transition" placeholder="dev@aytech.in">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                <input type="password" id="auth-password" class="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-[#58a6ff] transition" placeholder="••••••••">
            </div>
            <p id="auth-error" class="text-red-400 text-xs hidden"></p>
            <button id="btn-login" class="w-full py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-lg transition mt-4 shadow-md">
                Verify Credentials
            </button>
        </div>
    `;
    renderScreen(html);

    // Event listener setup
    document.getElementById("btn-login")?.addEventListener("click", async () => {
        const email = (document.getElementById("auth-email") as HTMLInputElement).value;
        const password = (document.getElementById("auth-password") as HTMLInputElement).value;
        const errorField = document.getElementById("auth-error") as HTMLParagraphElement;

        try {
            errorField.classList.add("hidden");
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            errorField.innerText = err.message || "Invalid credentials.";
            errorField.classList.remove("hidden");
        }
    });
}

// 2. Pre-Installation Portal View
function showInstallScreen(userEmail: string) {
    const html = `
        <div class="text-center py-4">
            <div class="w-16 h-16 bg-[#21262d] border border-[#30363d] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-1">App Integration Pending</h2>
            <p class="text-xs text-gray-400 mb-6">Authenticated as: <span class="text-gray-300 font-medium">${userEmail}</span></p>
            
            <div class="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-left text-sm text-gray-300 space-y-2 mb-6">
                <p class="flex items-center text-xs text-gray-400"><span class="w-1.5 h-1.5 bg-[#58a6ff] rounded-full mr-2"></span> Setup target sync pipelines.</p>
                <p class="flex items-center text-xs text-gray-400"><span class="w-1.5 h-1.5 bg-[#58a6ff] rounded-full mr-2"></span> Configure workspace structures.</p>
            </div>

            <button id="btn-install" class="w-full py-3 bg-[#58a6ff] hover:bg-[#388bfd] text-[#0d1117] font-bold rounded-lg transition mb-3 shadow-md flex items-center justify-center space-x-2">
                <span>Integrate App on GitHub</span>
            </button>
            <button id="btn-logout" class="text-xs text-gray-500 hover:text-red-400 transition underline">Sign Out</button>
        </div>
    `;
    renderScreen(html);

    // Redirect to GitHub App installation flow
    document.getElementById("btn-install")?.addEventListener("click", () => {
        window.location.href = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
    });

    document.getElementById("btn-logout")?.addEventListener("click", () => {
        signOut(auth);
    });
}

// 3. Thank You State (Successful Integration & Onboarding Dashboard)
function showThankYouScreen(userEmail: string) {
    const html = `
        <div class="text-center py-4 animate-fade-in">
            <div class="w-16 h-16 bg-[#1f6feb]/10 border border-[#238636] rounded-full flex items-center justify-center mx-auto mb-4 text-[#2ea043]">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 class="text-2xl font-bold text-white mb-1">Thank You!</h2>
            <p class="text-sm text-[#58a6ff] mb-6 font-medium">App Installed Successfully</p>

            <div class="bg-[#0d1117] border border-[#30363d] rounded-lg p-5 text-left mb-6 space-y-3">
                <div class="flex justify-between items-center border-b border-[#30363d] pb-2">
                    <span class="text-xs text-gray-400 uppercase font-semibold">System Pipeline</span>
                    <span class="text-xs bg-[#238636]/20 text-[#58a6ff] px-2 py-0.5 rounded border border-[#238636]/30 font-mono">ACTIVE</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed">
                    ClientHub engine is now running securely. Real-time webhooks, issue tracking matrices, and Firebase listeners are fully operating on **Render**.
                </p>
            </div>

            <a href="${INSTAGRAM_URL}" target="_blank" class="w-full py-3 bg-[#161b22] hover:bg-[#30363d] border border-[#30363d] text-white font-medium rounded-lg transition flex items-center justify-center space-x-2 mb-4">
                <span>Support & Enquiries via AyTech</span>
            </a>

            <button id="btn-logout" class="text-xs text-gray-500 hover:text-red-400 transition underline">Disconnect Portal Account</button>
        </div>
    `;
    renderScreen(html);

    document.getElementById("btn-logout")?.addEventListener("click", () => {
        // Clean URL params when logging out to re-check status next run
        window.history.replaceState({}, document.title, window.location.pathname);
        signOut(auth);
    });
}

// ---------------- State Watcher ----------------

// Core Auth Observer from Firebase
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User logged in -> Check if they arrived back from successful GitHub App Installation
        const isInstalled = getInstallationStatus();
        if (isInstalled) {
            showThankYouScreen(user.email || "Active User");
        } else {
            showInstallScreen(user.email || "Active User");
        }
    } else {
        // User is not signed in
        showLoginScreen();
    }
});
