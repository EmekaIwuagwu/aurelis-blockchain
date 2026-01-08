import React, { useState, useEffect } from 'react';
import {
    Wallet, Shield, Key, Copy, CheckCircle, ArrowRight, Home,
    Send, History, Settings, LogOut, ChevronRight, Eye, EyeOff,
    ExternalLink, ArrowUpRight, ArrowDownLeft, X, Copy as CopyIcon,
    RefreshCw, Lock, Globe, Server, ArrowLeft, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import * as bip39 from 'bip39';
import { Mnemonic, HDNodeWallet } from 'ethers';

// --- Types ---
type AppState = 'landing' | 'login' | 'import-wallet' | 'setup-password' | 'show-mnemonic' | 'confirm-mnemonic' | 'accept-terms' | 'dashboard';
type View = 'overview' | 'transactions' | 'settings' | 'send' | 'receive' | 'voting';

interface Transaction {
    id: string;
    type: 'send' | 'receive' | 'mined';
    amount: number;
    address: string;
    timestamp: string;
    hash: string;
    status: 'confirmed' | 'pending';
}

// --- Constants ---
const RPC_URL_DEFAULT = "http://localhost:18883";

const PageWrapper = (props: any) => (
    <motion.div
        {...props}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full max-w-md mx-auto"
    >
        {props.children}
    </motion.div>
);

export default function App() {
    // App State
    const [appState, setAppState] = useState<AppState>('landing');
    const [currentView, setCurrentView] = useState<View>('overview');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Wallet State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mnemonic, setMnemonic] = useState('');
    const [address, setAddress] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [mnemonicInput, setMnemonicInput] = useState('');
    const [balance, setBalance] = useState(0);
    const [nodeStatus, setNodeStatus] = useState<'online' | 'offline'>('online');
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    // Settings
    const [rpcUrl, setRpcUrl] = useState('http://127.0.0.1:18883');
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [blockchainInfo, setBlockchainInfo] = useState<any>(null);
    const [blockchainTransactions, setBlockchainTransactions] = useState<Transaction[]>([]);
    const [blockchainProposals, setBlockchainProposals] = useState<any[]>([]);

    // Form States
    const [sendAddress, setSendAddress] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendStep, setSendStep] = useState<'input' | 'review' | 'success'>('input');
    const [sentTxHash, setSentTxHash] = useState('');
    const [voteProposalId, setVoteProposalId] = useState<string | null>(null);

    // --- Effects ---
    useEffect(() => {
        const saved = localStorage.getItem('aurelis_wallet_setup');
        const storedAddr = localStorage.getItem('aurelis_address');
        if (saved === 'true' && storedAddr) {
            setAddress(storedAddr);
            if (!isLoggedIn) {
                setAppState('login');
            }
        }
    }, [isLoggedIn]);

    const fetchBlockchainData = async () => {
        if (!address) return;
        try {
            // Make requests sequentially to avoid overwhelming single-threaded RPC server
            const resBalance = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'getaddressbalance', params: [address], id: 1 })
            });
            const dataBalance = await resBalance.json();
            if (dataBalance.result !== undefined) setBalance(dataBalance.result);

            // Wait for previous request to complete before making next one
            const resInfo = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'getblockchaininfo', params: [], id: 2 })
            });
            const dataInfo = await resInfo.json();
            setBlockchainInfo(dataInfo.result);

            // Sequential request 3
            const resTx = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'getaddresstransactions', params: [address], id: 3 })
            });
            const dataTx = await resTx.json();
            if (dataTx.result && Array.isArray(dataTx.result)) {
                const mapped: Transaction[] = dataTx.result.map((tx: any, i: number) => {
                    const amountAUC = (tx.amount || 0) / 100000000;
                    let type: 'send' | 'receive' | 'mined' = tx.type || 'receive';

                    if (tx.address === 'Genesis' || tx.type === 'mined') {
                        type = 'mined';
                    }

                    return {
                        id: i.toString(),
                        type: type,
                        amount: amountAUC,
                        address: tx.address || 'Unknown',
                        timestamp: tx.timestamp || 'Recent',
                        hash: tx.hash,
                        status: 'confirmed'
                    };
                }).filter((tx: Transaction) => {
                    // Filter removed: Trust the RPC to return relevant transactions
                    return true;
                });
                setBlockchainTransactions(mapped);
            }

            // Sequential request 4
            const resProp = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'getproposals', params: [], id: 4 })
            });
            const dataProp = await resProp.json();
            if (dataProp.result && Array.isArray(dataProp.result)) {
                setBlockchainProposals(dataProp.result);
            }

            setNodeStatus('online');
        } catch (e) {
            console.error("RPC Error:", e);
            setNodeStatus('offline');
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchBlockchainData();
            const interval = setInterval(fetchBlockchainData, 5000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, rpcUrl]);

    // --- Handlers ---
    const handlePasswordSubmit = () => {
        if (password && password === confirmPassword) {
            localStorage.setItem('aurelis_password', password);

            // If we don't have a mnemonic yet (new wallet), generate one
            if (!mnemonic) {
                const m = bip39.generateMnemonic();
                const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(m));
                const addr = "AUR" + wallet.address.substring(2);
                setMnemonic(m);
                setAddress(addr);
                setPrivateKey(wallet.privateKey);
                setAppState('show-mnemonic');
            } else {
                // If we already had one (from import), go straight to terms or dashboard
                setAppState('accept-terms');
            }
        }
    };

    const handleLogin = () => {
        const storedPassword = localStorage.getItem('aurelis_password');
        const storedMnemonic = localStorage.getItem('aurelis_mnemonic');
        const storedPk = localStorage.getItem('aurelis_private_key');
        const storedAddr = localStorage.getItem('aurelis_address');

        if (password === storedPassword) {
            setMnemonic(storedMnemonic || '');
            setPrivateKey(storedPk || '');
            setAddress(storedAddr || '');
            setIsLoggedIn(true);
            setAppState('dashboard');
        } else {
            alert("Incorrect password. Please try again.");
        }
    };

    const handleImportMnemonic = () => {
        try {
            if (!bip39.validateMnemonic(mnemonicInput)) {
                alert("Invalid mnemonic phrase. Please check and try again.");
                return;
            }
            const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonicInput));
            const addr = "AUR" + wallet.address.substring(2);
            setMnemonic(mnemonicInput);
            setAddress(addr);
            setPrivateKey(wallet.privateKey);
            // Now ask for a password to protect this imported wallet
            setAppState('setup-password');
        } catch (e) {
            alert("Error importing wallet: " + (e as Error).message);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setAppState('landing');
        setPassword('');
        setMnemonicInput('');
        setMnemonic('');
        setAddress('');
        setPrivateKey('');
    };

    // --- Components ---



    // --- Views ---

    const LandingView = () => {
        const hasWallet = !!localStorage.getItem('aurelis_wallet_setup');

        return (
            <PageWrapper key="landing">
                <div className="text-center py-12 relative flex flex-col items-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-12"
                    >
                        <img
                            src="/logo.png"
                            alt="Aurelis"
                            className="w-72 h-72 object-contain drop-shadow-[0_0_50px_rgba(212,175,55,0.4)]"
                        />
                    </motion.div>

                    <h1 className="text-6xl font-serif font-black mb-2 gold-text tracking-[0.15em] italic">AURELIS</h1>
                    <p className="text-muted-foreground mb-12 uppercase tracking-[0.3em] text-sm font-bold opacity-70">The Republic's Official Ledger</p>

                    <div className="space-y-4 w-full max-w-sm">
                        {hasWallet ? (
                            <button
                                onClick={() => setAppState('login')}
                                className="w-full py-5 rounded-2xl gold-button flex items-center justify-center gap-3 text-lg font-bold shadow-xl group"
                            >
                                Unlock Vault <Lock size={22} className="group-hover:scale-110 transition-transform" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setAppState('setup-password')}
                                className="w-full py-5 rounded-2xl gold-button flex items-center justify-center gap-3 text-lg font-bold shadow-xl group"
                            >
                                Create New Wallet <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                            </button>
                        )}
                        <button
                            onClick={() => setAppState('import-wallet')}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-sm"
                        >
                            Recover Wallet
                        </button>
                    </div>
                </div>
            </PageWrapper>
        );
    };

    const LoginView = () => (
        <PageWrapper key="login">
            <div className="space-y-10 text-center">
                <div className="relative">
                    <img src="/logo.png" alt="Aurelis" className="w-48 h-48 mx-auto object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.3)] mb-6" />
                </div>

                <header>
                    <h2 className="text-4xl font-serif font-bold gold-text italic tracking-wider">Welcome Citizen</h2>
                    <p className="text-muted-foreground mt-4 text-sm tracking-widest uppercase opacity-60">Unlock your digital sovereignty</p>
                </header>

                <div className="space-y-5 bg-black/40 p-8 rounded-[2.5rem] glass border border-white/5">
                    <input
                        type="password"
                        placeholder="Security Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-center text-lg outline-none focus:border-primary/50 transition-all font-mono tracking-[0.5em]"
                    />
                    <button
                        onClick={handleLogin}
                        disabled={!password}
                        className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-2xl disabled:opacity-30 disabled:grayscale transition-all"
                    >
                        Unlock Ledger
                    </button>
                </div>

                <button
                    onClick={() => setAppState('landing')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] font-bold"
                >
                    &larr; Switch Wallet
                </button>
            </div>
        </PageWrapper>
    );

    const ImportView = () => (
        <PageWrapper key="import">
            <div className="space-y-8">
                <header className="text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                        <Key size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Import Recovery Phrase</h2>
                    <p className="text-muted-foreground text-sm mt-2 max-w-[280px]">Enter your 12-word mnemonic phrase to recover your Aurelis account.</p>
                </header>

                <div className="space-y-6">
                    <textarea
                        value={mnemonicInput}
                        onChange={(e) => setMnemonicInput(e.target.value)}
                        placeholder="word1 word2 word3..."
                        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-primary/50 transition-all resize-none font-mono leading-relaxed"
                    />

                    <button
                        disabled={!mnemonicInput.trim()}
                        onClick={handleImportMnemonic}
                        className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-[0_0_40px_rgba(212,175,55,0.2)] disabled:opacity-50"
                    >
                        Continue to Setup Password
                    </button>

                    <button
                        onClick={() => setAppState('landing')}
                        className="w-full py-2 text-muted-foreground hover:text-white transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </PageWrapper>
    );

    const SetupPasswordView = () => (
        <PageWrapper key="password">
            <div className="space-y-8">
                <header className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                        <Lock className="text-primary" size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold gold-text">Seal Your Vault</h2>
                    <p className="text-muted-foreground text-sm mt-2">Create a master password to encrypt your sovereignty.</p>
                </header>

                <div className="space-y-6 bg-black/40 p-8 rounded-[2.5rem] glass border border-white/5">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground ml-2">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 focus:border-primary/50 outline-none transition-all font-mono tracking-widest"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground ml-2">Verify Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 focus:border-primary/50 outline-none transition-all font-mono tracking-widest"
                        />
                    </div>

                    <button
                        disabled={!password || password !== confirmPassword}
                        onClick={handlePasswordSubmit}
                        className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-2xl disabled:opacity-30 disabled:grayscale transition-all mt-4"
                    >
                        Secure Wallet & Continue
                    </button>

                    <button
                        onClick={() => setAppState('landing')}
                        className="w-full text-xs text-muted-foreground hover:text-white transition-colors uppercase tracking-widest font-bold mt-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </PageWrapper>
    );

    const MnemonicView = () => (
        <PageWrapper key="mnemonic">
            <div className="space-y-8">
                <header className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                        <Shield className="text-primary" size={40} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold gold-text">Recovery Phrase</h2>
                    <p className="text-muted-foreground text-sm mt-2">Write down these 12 words. They are the keys to your kingdom.</p>
                </header>

                <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 glass grid grid-cols-2 gap-4">
                    {mnemonic.split(' ').map((word, i) => (
                        <div key={i} className="bg-white/5 rounded-2xl py-3 px-4 flex items-center gap-3 border border-white/[0.02]">
                            <span className="text-[10px] text-primary/40 font-mono font-bold w-4">{i + 1}</span>
                            <span className="font-medium text-base tracking-wide">{word}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(mnemonic);
                            const btn = document.getElementById('copy-btn');
                            if (btn) btn.innerText = 'PHRASE COPIED';
                            setTimeout(() => { if (btn) btn.innerText = 'COPY TO CLIPBOARD'; }, 2000);
                        }}
                        id="copy-btn"
                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground hover:text-white hover:border-white/20 transition-all"
                    >
                        COPY TO CLIPBOARD
                    </button>

                    <button
                        onClick={() => setAppState('confirm-mnemonic')}
                        className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-xl"
                    >
                        I've Secured the Phrase
                    </button>
                </div>
            </div>
        </PageWrapper>
    );

    const ConfirmMnemonicView = () => (
        <PageWrapper key="confirm">
            <div className="space-y-8">
                <header className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                        <Key className="text-primary" size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold gold-text">Verify Phrase</h2>
                    <p className="text-muted-foreground text-sm mt-2">To ensure your security, please re-enter your 12 recovery words.</p>
                </header>

                <div className="bg-black/40 p-1 rounded-[2.5rem] glass border border-white/5">
                    <textarea
                        value={mnemonicInput}
                        onChange={(e) => setMnemonicInput(e.target.value)}
                        placeholder="Type your mnemonic here..."
                        className="w-full h-40 bg-transparent rounded-[2.5rem] p-8 text-lg outline-none font-mono leading-relaxed placeholder:opacity-20 text-center"
                    />
                </div>

                <div className="space-y-4">
                    <button
                        disabled={mnemonicInput.trim() !== mnemonic}
                        onClick={() => setAppState('accept-terms')}
                        className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-xl disabled:opacity-30 transition-all"
                    >
                        Verify & Continue
                    </button>
                    <button
                        onClick={() => setAppState('show-mnemonic')}
                        className="w-full text-xs text-muted-foreground hover:text-white uppercase tracking-widest font-bold"
                    >
                        &larr; Go Back
                    </button>
                </div>
            </div>
        </PageWrapper>
    );

    const TermsView = () => (
        <PageWrapper key="terms">
            <div className="space-y-8">
                <header className="text-center text-primary">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold gold-text italic">Imperial Compact</h2>
                    <p className="text-muted-foreground text-sm mt-2 uppercase tracking-widest opacity-60">Aurelis Protocol Agreement</p>
                </header>

                <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 glass space-y-6 text-sm leading-relaxed text-muted-foreground italic">
                    <p className="border-l-2 border-primary/30 pl-4">I understand that loss of access to my seed phrase will result in the permanent forfeiture of all my digital assets. Aurelis cannot recover my account.</p>
                    <p className="border-l-2 border-primary/30 pl-4">I acknowledge that all transactions on the Aurelis network are final and irreversible upon block confirmation.</p>
                    <p className="border-l-2 border-primary/30 pl-4">By entering the Republic, I assume full custody over my private keys and digital sovereignty.</p>
                </div>

                <button
                    onClick={handleSetupComplete}
                    className="w-full py-5 rounded-2xl gold-button text-xl font-bold shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
                >
                    Accept Compact & Enter <ChevronRight size={24} />
                </button>
            </div>
        </PageWrapper>
    );

    // --- Main Dashboard Components ---

    const Sidebar = () => (
        <div className="w-20 lg:w-72 glass border-r border-white/5 h-screen flex flex-col p-6 bg-gradient-to-b from-black/60 to-black/20">
            <div className="flex items-center gap-4 px-2 mb-16">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                    <img src="/logo.png" alt="Aurelis" className="w-12 h-12 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
                </div>
                <div className="hidden lg:block overflow-hidden">
                    <h1 className="font-serif font-black text-2xl tracking-[0.2em] gold-text italic leading-none">AURELIS</h1>
                    <p className="text-[8px] uppercase tracking-[0.4em] text-muted-foreground mt-1 font-bold opacity-50">Republic Ledger</p>
                </div>
            </div>

            <nav className="flex-1 space-y-3">
                {[
                    { id: 'overview', icon: Home, label: 'Dashboard' },
                    { id: 'transactions', icon: History, label: 'Activity' },
                    { id: 'settings', icon: Settings, label: 'Settings' },
                    { id: 'voting', icon: Shield, label: 'Governance', color: 'text-purple-400' }
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setCurrentView(item.id as View);
                            setSendStep('input');
                        }}
                        className={`w-full p-4 rounded-2xl flex items-center gap-5 transition-all duration-300 relative group ${currentView === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]' : 'hover:bg-white/5 text-muted-foreground'}`}
                    >
                        <item.icon size={22} className={currentView === item.id ? 'scale-110 transition-transform' : 'group-hover:scale-110 transition-transform'} />
                        <span className="font-bold hidden lg:block uppercase tracking-widest text-[10px]">{item.label}</span>
                        {currentView === item.id && (
                            <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-primary rounded-full" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="pt-6 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="w-full p-4 rounded-2xl flex items-center gap-5 text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all group"
                >
                    <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold hidden lg:block uppercase tracking-widest text-[10px]">Logout</span>
                </button>
            </div>
        </div>
    );

    const TransactionModal = () => (
        <AnimatePresence>
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedTx(null)}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg glass rounded-3xl p-8 overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 ${selectedTx.type === 'receive' ? 'bg-green-500/10' : 'bg-red-500/10'}`}></div>

                        <header className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                {selectedTx.type === 'receive' ? (
                                    <>
                                        <div className="p-2 bg-green-500/20 text-green-400 rounded-full"><ArrowDownLeft size={24} /></div>
                                        Received Funds
                                    </>
                                ) : selectedTx.type === 'mined' ? (
                                    <>
                                        <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-full"><Shield size={24} /></div>
                                        System / Genesis
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-red-500/20 text-red-400 rounded-full"><ArrowUpRight size={24} /></div>
                                        Sent Funds
                                    </>
                                )}
                            </h3>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </header>

                        <div className="space-y-6">
                            <div className="text-center py-6 border-y border-white/5">
                                <p className="text-muted-foreground text-sm uppercase tracking-widest mb-1">Amount</p>
                                <p className={`text-4xl font-bold ${selectedTx.type === 'receive' ? 'text-green-400' : selectedTx.type === 'mined' ? 'text-yellow-500' : 'text-foreground'}`}>
                                    {selectedTx.type === 'receive' ? '+' : selectedTx.type === 'mined' ? '❖ ' : '-'}{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} <span className="text-lg opacity-60">AUC</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1 uppercase tracking-tighter font-bold">From/To</p>
                                    <p className="font-mono text-xs break-all leading-relaxed">{selectedTx.address}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Timestamp</p>
                                    <p>{selectedTx.timestamp}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Transaction Hash</p>
                                    <p className="font-mono text-xs break-all bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                        {selectedTx.hash}
                                        <CopyIcon
                                            size={14}
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedTx.hash);
                                                alert("Hash copied!");
                                            }}
                                        />
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                                    <ExternalLink size={18} /> View on Explorer
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const DashboardContent = () => {
        // Use the pre-filtered blockchain transactions directly
        const transactions: Transaction[] = blockchainTransactions;

        if (currentView === 'send') {
            return (
                <div className="max-w-2xl mx-auto p-4 lg:p-12 space-y-8">
                    <AnimatePresence mode="wait">
                        {sendStep === 'input' && (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-8"
                            >
                                <header>
                                    <h1 className="text-3xl font-bold font-serif gold-text">Send Aurelis Crown</h1>
                                    <p className="text-muted-foreground text-sm mt-2">Transfer sovereignty within the Republic.</p>
                                </header>

                                <div className="glass rounded-3xl p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recipient Address</label>
                                        <input
                                            type="text"
                                            value={sendAddress}
                                            onChange={(e) => setSendAddress(e.target.value)}
                                            placeholder="AUR..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-sm outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount (AUC)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={sendAmount}
                                                onChange={(e) => setSendAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xl font-bold outline-none focus:border-primary/50 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif font-bold text-primary">AUC</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Network Fee: ~0.0001 AUC</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Available: {balance.toLocaleString()} AUC</p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            disabled={!sendAddress || !sendAmount || parseFloat(sendAmount) <= 0}
                                            onClick={() => setSendStep('review')}
                                            className="w-full py-5 rounded-2xl gold-button text-lg flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            Review Transaction <ArrowRight size={24} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {sendStep === 'review' && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <header className="flex items-center gap-4">
                                    <button onClick={() => setSendStep('input')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                                        <ArrowLeft size={24} />
                                    </button>
                                    <div>
                                        <h1 className="text-3xl font-bold font-serif gold-text">Review Transaction</h1>
                                        <p className="text-muted-foreground text-sm">Verify the final details of your transfer.</p>
                                    </div>
                                </header>

                                <div className="glass rounded-3xl p-8 space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] rounded-full"></div>

                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Total to Send</p>
                                        <div className="flex items-baseline justify-center gap-2">
                                            <span className="text-5xl font-extrabold">{sendAmount}</span>
                                            <span className="text-xl font-serif text-primary">AUC</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t border-white/5 pt-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">Recipient</p>
                                                <p className="font-mono text-sm break-all max-w-[280px] leading-tight text-primary/80">{sendAddress}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">Network</p>
                                                <p className="text-sm font-bold">Aurelis Mainnet</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center py-4 bg-white/5 rounded-2xl px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <RefreshCw size={14} className="text-primary animate-spin-slow" />
                                                </div>
                                                <span className="text-sm">Estimated Fee</span>
                                            </div>
                                            <span className="font-mono text-sm text-green-400">0.000125 AUC</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                btn.disabled = true;
                                                btn.innerText = "Broadcasting...";

                                                try {
                                                    const res = await fetch(rpcUrl, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            jsonrpc: '2.0',
                                                            method: 'transfer',
                                                            params: [address, sendAddress, Math.round(parseFloat(sendAmount) * 100000000)],
                                                            id: Date.now()
                                                        })
                                                    });
                                                    const data = await res.json();

                                                    if (data.result && !data.result.startsWith('Error')) {
                                                        setSentTxHash(data.result);
                                                        setSendStep('success');
                                                        fetchBlockchainData(); // Refresh immediately
                                                    } else {
                                                        alert("Transaction failed: " + (data.result || "Unknown error"));
                                                        setSendStep('input');
                                                    }
                                                } catch (err) {
                                                    alert("Network error: " + err);
                                                    setSendStep('input');
                                                } finally {
                                                    btn.disabled = false;
                                                    btn.innerText = "Confirm & Broadcast";
                                                }
                                            }}
                                            className="w-full py-5 rounded-2xl gold-button text-xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(212,175,55,0.3)] disabled:opacity-50"
                                        >
                                            Confirm & Broadcast <CheckCircle size={24} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {sendStep === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-8"
                            >
                                <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                    <Check size={48} />
                                </div>
                                <header>
                                    <h1 className="text-4xl font-serif font-black gold-text">Transaction Sent</h1>
                                    <p className="text-muted-foreground mt-2">Your Aurelis Crown transfer is being mined.</p>
                                </header>

                                <div className="glass rounded-3xl p-8 space-y-6">
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Transaction Hash</p>
                                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-[10px] break-all text-primary/60">
                                            {sentTxHash}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => {
                                                setSendStep('input');
                                                setSendAddress('');
                                                setSendAmount('');
                                                setCurrentView('transactions');
                                            }}
                                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold"
                                        >
                                            Close & view History
                                        </button>
                                        <button className="text-primary text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80">
                                            <ExternalLink size={16} /> View on Explorer
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        if (currentView === 'receive') {
            return (
                <div className="max-w-2xl mx-auto p-4 lg:p-12 space-y-8 text-center">
                    <header>
                        <h1 className="text-3xl font-bold font-serif gold-text">Receive Funds</h1>
                        <p className="text-muted-foreground text-sm mt-2">Display your credentials to receive Aurelis Crown.</p>
                    </header>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-[3rem] p-12 space-y-8 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gold-metallic"></div>

                        <div className="relative inline-block group">
                            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-white p-6 rounded-[2rem] shadow-[0_0_60px_rgba(212,175,55,0.2)]">
                                <QRCodeCanvas
                                    value={address}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                    imageSettings={{
                                        src: "/logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: 40,
                                        width: 40,
                                        excavate: true,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Your Sovereign Address</p>
                            <div className="bg-black/60 border border-white/5 p-5 rounded-2xl flex items-center justify-between group shadow-inner">
                                <span className="font-mono text-xs text-primary break-all text-left pr-4 selection:bg-primary/20">{address}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(address);
                                        const btn = document.getElementById('copy-addr');
                                        if (btn) btn.innerText = 'Copied';
                                        setTimeout(() => { if (btn) btn.innerText = 'Copy'; }, 2000);
                                    }}
                                    className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors hover:bg-white/10 border border-white/5"
                                    id="copy-addr"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed px-8 italic opacity-70">
                            "The wealth of the Empire flows only into the hands of its true citizens."
                        </p>
                    </motion.div>
                </div>
            );
        }

        if (currentView === 'voting') {
            const defaultProposals = [
                { id: '1', title: 'Establish Imperial Research Center', status: 'Active', votes: '14,205', end: '3 days left' },
                { id: '2', title: 'Expand P2P Network Capacity', status: 'Active', votes: '8,421', end: '5 days left' },
                { id: '3', title: 'Update Sovereign Minting Policy', status: 'Ended', votes: '25,000', end: 'Passed' },
            ];
            const proposals = blockchainProposals.length > 0 ? blockchainProposals : defaultProposals;

            return (
                <div className="max-w-4xl mx-auto p-4 lg:p-12 space-y-10">
                    <header className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold font-serif gold-text">Governance Hub</h1>
                            <p className="text-muted-foreground text-sm mt-2">Participate in the democratic future of the Republic.</p>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full flex items-center gap-2">
                            <CheckCircle size={16} className="text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Active Citizen</span>
                        </div>
                    </header>

                    <div className="grid gap-6">
                        {proposals.map((prop) => (
                            <div key={prop.id} className="glass rounded-3xl p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-purple-500/30 transition-all border border-transparent">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${prop.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground'}`}>
                                            {prop.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{prop.end}</span>
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight">{prop.title}</h3>
                                    <p className="text-sm text-muted-foreground">{prop.votes} AUC Power Voted</p>
                                </div>

                                {prop.status === 'Active' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => alert("Voting YES on blockchain...")}
                                            className="px-6 py-3 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all font-bold text-sm"
                                        >
                                            VOTE YES
                                        </button>
                                        <button
                                            onClick={() => alert("Voting NO on blockchain...")}
                                            className="px-6 py-3 rounded-xl bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-all font-bold text-sm"
                                        >
                                            VOTE NO
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
                        <Lock className="mx-auto text-muted-foreground opacity-40" size={32} />
                        <h4 className="font-bold">Protocol Upgrade Voting</h4>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">Upcoming technical upgrades require a 66% supermajority of ALL staked AUC. Make sure your voice is heard.</p>
                    </div>
                </div>
            );
        }

        if (currentView === 'overview') {
            return (
                <div className="space-y-8 max-w-4xl mx-auto p-4 lg:p-12">
                    {/* Header */}
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold font-serif gold-text">Welcome back, Citizen</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span className={`w-2 h-2 rounded-full ${nodeStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                Node Connected: {rpcUrl} {blockchainInfo ? `(Block ${blockchainInfo.blocks})` : ''}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentView('send')}
                                className="gold-button px-6 py-3 rounded-xl flex items-center gap-2"
                            >
                                <Send size={18} /> Send
                            </button>
                            <button
                                onClick={() => setCurrentView('receive')}
                                className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-colors"
                            >
                                <ArrowDownLeft size={18} /> Receive
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Balance Card */}
                        <div className="lg:col-span-2 relative overflow-hidden glass rounded-[2.5rem] p-10 group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                            <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold mb-2">Available Balance</p>
                            <div className="flex items-baseline gap-3 mb-8">
                                <h2 className="text-6xl font-extrabold tracking-tighter">{(balance / 100000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</h2>
                                <span className="text-2xl font-serif font-bold text-primary">AUC</span>
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Your Aurelis Address</p>
                                <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                                    <span className="font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">{address}</span>
                                    <CopyIcon
                                        onClick={() => {
                                            navigator.clipboard.writeText(address);
                                            alert("Address copied to clipboard!");
                                        }}
                                        size={16}
                                        className="text-muted-foreground cursor-pointer hover:text-primary transition-colors flex-shrink-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Price/Market Card (Mock) */}
                        <div className="glass rounded-[2.5rem] p-8 flex flex-col justify-between border-primary/10">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-4">Currency</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl">👑</div>
                                    <div>
                                        <p className="font-bold">Aurelis Crown</p>
                                        <p className="text-xs text-muted-foreground">AUC Protocol</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Price</p>
                                <p className="text-2xl font-bold">$1.42 <span className="text-xs text-green-400 font-normal">+5.2%</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Recent History Table */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <History size={20} className="text-primary" />
                                Recent History
                            </h3>
                            <button
                                onClick={() => setCurrentView('transactions')}
                                className="text-primary text-sm font-medium hover:underline"
                            >
                                View all
                            </button>
                        </div>
                        <div className="glass rounded-3xl overflow-hidden border border-white/5">
                            <div className="divide-y divide-white/5">
                                {transactions.length > 0 ? (
                                    transactions.slice(0, 3).map((tx) => (
                                        <div
                                            key={tx.id}
                                            onClick={() => setSelectedTx(tx)}
                                            className="p-6 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${tx.type === 'receive' ? 'bg-green-500/10 text-green-400' : tx.type === 'mined' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {tx.type === 'receive' ? <ArrowDownLeft size={20} /> : tx.type === 'mined' ? <Shield size={20} /> : <ArrowUpRight size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{tx.type === 'receive' ? 'Received Funds' : tx.type === 'mined' ? 'Mined Reward' : 'Sent Funds'}</p>
                                                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                                        {tx.type === 'receive' ? 'From ' : tx.type === 'mined' ? 'Source: ' : 'To '}
                                                        <span className="font-mono opacity-70">{tx.address.substring(0, 8)}...</span> • {tx.timestamp}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`font-bold ${tx.type === 'receive' ? 'text-green-400' : tx.type === 'mined' ? 'text-yellow-500' : 'text-red-400'}`}>
                                                {tx.type === 'receive' ? '+' : tx.type === 'mined' ? '❖ ' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUC
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center">
                                        <History size={48} className="mx-auto text-white/10 mb-4" />
                                        <p className="text-muted-foreground text-sm font-medium">No transactions yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            );
        }

        if (currentView === 'transactions') {
            return (
                <div className="max-w-4xl mx-auto p-4 lg:p-12 space-y-8">
                    <header>
                        <h1 className="text-3xl font-bold font-serif gold-text">Activity History</h1>
                        <p className="text-muted-foreground text-sm mt-2">Every transaction on the Aurelis network recorded in the ledger.</p>
                    </header>

                    <div className="glass rounded-3xl overflow-hidden min-h-[500px]">
                        <div className="divide-y divide-white/5">
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        onClick={() => setSelectedTx(tx)}
                                        className="p-6 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`p-3 rounded-2xl ${tx.type === 'receive' ? 'bg-green-500/10 text-green-400' : tx.type === 'mined' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-400'}`}>
                                                {tx.type === 'receive' ? <ArrowDownLeft size={24} /> : tx.type === 'mined' ? <Shield size={24} /> : <ArrowUpRight size={24} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-base">{tx.type === 'receive' ? 'Received Funds' : tx.type === 'mined' ? 'Mined Reward' : 'Sent Funds'}</p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1 opacity-60">
                                                    {tx.type === 'receive' ? 'Sender: ' : tx.type === 'mined' ? 'Origin: ' : 'Recipient: '} {tx.address}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">{tx.timestamp}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-lg ${tx.type === 'receive' ? 'text-green-400' : tx.type === 'mined' ? 'text-yellow-500' : 'text-red-400'}`}>
                                                {tx.type === 'receive' ? '+' : tx.type === 'mined' ? '❖ ' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUC
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">Confirmed on Ledger</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-24 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <History size={40} className="text-white/20" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">No transactions found</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">Your imperial ledger is currently empty. Start by receiving or sending AUC tokens.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (currentView === 'settings') {
            return (
                <div className="max-w-3xl mx-auto p-4 lg:p-12 space-y-12">
                    <header>
                        <h1 className="text-3xl font-bold font-serif gold-text">Wallet Settings</h1>
                        <p className="text-muted-foreground text-sm mt-2">Manage your connection, security, and credentials.</p>
                    </header>

                    <div className="space-y-6">
                        <section className="bg-card/40 border border-white/5 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <Globe className="text-primary" size={20} />
                                <h3 className="font-bold text-lg tracking-tight uppercase">Network Configuration</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                        <Server size={12} /> RPC Provider URL
                                    </label>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            value={rpcUrl}
                                            onChange={(e) => setRpcUrl(e.target.value)}
                                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/40 outline-none font-mono"
                                        />
                                        <button
                                            onClick={() => {
                                                fetchBlockchainData();
                                                alert("Connection re-established with provider.");
                                            }}
                                            className="gold-button px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap shadow-lg active:scale-95 transition-all"
                                        >
                                            Save & Sync
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-card/40 border border-white/5 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <Lock className="text-primary" size={20} />
                                <h3 className="font-bold text-lg tracking-tight uppercase">Security & Privacy</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20">
                                    <p className="text-[10px] text-red-400 uppercase font-black tracking-[0.2em] mb-2">Extreme Danger</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-red-400">Export Private Key</p>
                                            <p className="text-xs text-muted-foreground">This grants total control over your funds.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                                            className="p-3 bg-red-400/10 text-red-400 rounded-xl hover:bg-red-400/20 transition-colors"
                                        >
                                            {showPrivateKey ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {showPrivateKey && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 p-4 bg-black/60 rounded-xl border border-red-400/10 font-mono text-xs break-all leading-relaxed select-all"
                                        >
                                            {privateKey || 'Not Available'}
                                        </motion.div>
                                    )}
                                </div>

                                <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm">Change Wallet Password</p>
                                            <p className="text-xs text-muted-foreground">Update your master security key.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newPass = prompt("Enter new password:");
                                                if (newPass) {
                                                    localStorage.setItem('aurelis_password', newPass);
                                                    alert("Password updated successfully!");
                                                }
                                            }}
                                            className="p-2 px-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleSetupComplete = () => {
        localStorage.setItem('aurelis_wallet_setup', 'true');
        localStorage.setItem('aurelis_address', address);
        localStorage.setItem('aurelis_mnemonic', mnemonic);
        localStorage.setItem('aurelis_private_key', privateKey);
        setAppState('dashboard');
        setIsLoggedIn(true);
    };

    // --- Main Render Logic ---

    return (
        <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30 selection:text-white relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-[60vw] h-[60vh] bg-primary/10 blur-[150px] -translate-x-1/4 -translate-y-1/4 pointer-events-none opacity-40"></div>
            <div className="fixed bottom-0 right-0 w-[50vw] h-[50vh] bg-primary/5 blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none opacity-30"></div>

            {!isLoggedIn ? (
                <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
                    <AnimatePresence mode="wait">
                        {appState === 'landing' && LandingView()}
                        {appState === 'login' && LoginView()}
                        {appState === 'import-wallet' && ImportView()}
                        {appState === 'setup-password' && SetupPasswordView()}
                        {appState === 'show-mnemonic' && MnemonicView()}
                        {appState === 'confirm-mnemonic' && ConfirmMnemonicView()}
                        {appState === 'accept-terms' && TermsView()}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex h-screen overflow-hidden bg-black/40">
                    {Sidebar()}
                    <main className="flex-1 overflow-y-auto bg-black/10">
                        <div className="relative z-10">
                            {DashboardContent()}
                        </div>
                        {TransactionModal()}
                    </main>
                </div>
            )}
        </div>
    );
}
