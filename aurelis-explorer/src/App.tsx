import React, { useState, useEffect } from 'react';
import {
    Search, Box, Activity, Database, Clock,
    ArrowRight, Layers, Cpu, Globe, Zap,
    Menu, Bell, User, PieChart, Shield,
    ChevronLeft, Hash, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type View = 'dashboard' | 'blocks' | 'transactions' | 'nodes' | 'block-detail' | 'tx-detail';

// --- RPC Helper ---
const rpc = async (method: string, params: any[] = []) => {
    try {
        const res = await fetch('http://localhost:18883', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() })
        });
        const data = await res.json();
        return data.result;
    } catch (e) {
        console.error("RPC Error", e);
        return null;
    }
};

export default function App() {
    const [view, setView] = useState<View>('dashboard');
    const [detailId, setDetailId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Global Stats
    const [miningInfo, setMiningInfo] = useState<any>(null);
    const [latestBlocks, setLatestBlocks] = useState<any[]>([]);

    useEffect(() => {
        const fetchGlobal = async () => {
            const info = await rpc('getmininginfo');
            const bestHash = await rpc('getbestblockhash');
            if (info && bestHash) {
                setMiningInfo({ ...info, bestblockhash: bestHash });

                // Fetch last 5 blocks
                const h = info.blocks;
                const blocks = [];
                for (let i = 0; i < 5; i++) {
                    if (h - i >= 0) {
                        const b = await rpc('getblock', [h - i]);
                        if (b) blocks.push(b);
                    }
                }
                setLatestBlocks(blocks);
            }
        };
        fetchGlobal();
        const t = setInterval(fetchGlobal, 10000);
        return () => clearInterval(t);
    }, []);

    const handleSearch = async () => {
        if (!searchQuery) return;

        // Try as Block Hash
        const block = await rpc('getblock', [searchQuery]);
        if (block && !block.toString().includes("not found")) {
            setDetailId(block.hash);
            setView('block-detail');
            return;
        }

        // Try as Tx Hash
        const tx = await rpc('gettransaction', [searchQuery]);
        if (tx && !tx.toString().includes("not found")) {
            setDetailId(searchQuery);
            setView('tx-detail');
            return;
        }

        // Try as Block Height
        if (!isNaN(parseInt(searchQuery))) {
            const bHeight = await rpc('getblock', [parseInt(searchQuery)]);
            if (bHeight && !bHeight.toString().includes("not found")) {
                setDetailId(bHeight.hash);
                setView('block-detail');
                return;
            }
        }

        alert("Search not found on chain.");
    };

    // --- Views ---

    const DashboardView = () => (
        <div className="space-y-12">
            <header className="text-center space-y-4 py-12">
                <h1 className="text-5xl lg:text-7xl font-serif font-extrabold tracking-tight italic gold-text">Explore the Empire</h1>
                <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-light tracking-wide">Real-time gateway to the Republic of Aurelis sovereign ledger.</p>

                <div className="max-w-2xl mx-auto relative group mt-8">
                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center bg-card p-2 rounded-3xl border border-white/10 shadow-2xl">
                        <Search className="ml-4 text-muted-foreground" size={24} />
                        <input
                            type="text"
                            placeholder="Search by Address, Transaction Hash, Block Height..."
                            className="flex-1 bg-transparent px-4 py-4 outline-none text-lg font-light italic"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} className="gold-button px-8 py-4 rounded-2xl flex items-center gap-2">
                            Search <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Block Height" value={miningInfo?.blocks} icon={Database} color="bg-blue-500" />
                <StatCard title="Current Difficulty" value={miningInfo?.difficulty?.toFixed(2)} icon={Activity} color="bg-primary" />
                <StatCard title="Network Hashes" value="0.0 H/s" icon={Zap} color="bg-yellow-500" />
                <StatCard title="Total Peer Count" value="1" icon={Globe} color="bg-green-500" />
            </div>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Layers className="text-primary" /> Latest Blocks
                    </h2>
                    <button onClick={() => setView('blocks')} className="text-sm font-bold text-primary hover:underline">View All Blocks</button>
                </div>
                <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
                    <div className="divide-y divide-white/5">
                        {latestBlocks.map((b) => (
                            <motion.div
                                key={b.hash}
                                onClick={() => { setDetailId(b.hash); setView('block-detail'); }}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                                className="p-6 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex flex-col items-center justify-center font-bold text-primary border border-white/5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Bk</span>
                                        {b.height}
                                    </div>
                                    <div>
                                        <p className="font-bold font-mono text-sm">{b.hash}</p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                            <Clock size={12} /> {new Date(b.time * 1000).toLocaleString()} • {b.tx.length} txs
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-tighter">
                                        Mined
                                    </div>
                                    <p className="text-xs font-mono mt-2 text-muted-foreground">{b.size} bytes</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );

    const BlockDetailView = () => {
        const [block, setBlock] = useState<any>(null);
        useEffect(() => {
            if (detailId) rpc('getblock', [detailId]).then(setBlock);
        }, [detailId]);

        if (!block) return <div className="text-center py-20">Loading Block...</div>;

        return (
            <div className="max-w-5xl mx-auto space-y-8 py-10">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>

                <header>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Box size={32} /></div>
                        <h1 className="text-4xl font-bold font-serif gold-text">Block #{block.height}</h1>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground break-all">{block.hash}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-8 rounded-3xl space-y-4">
                        <h3 className="font-bold text-lg border-b border-white/10 pb-2">Summary</h3>
                        <DetailRow label="Timestamp" value={new Date(block.time * 1000).toLocaleString()} />
                        <DetailRow label="Transactions" value={block.tx.length} />
                        <DetailRow label="Size" value={`${block.size} bytes`} />
                        <DetailRow label="Confirmations" value={block.confirmations} />
                    </div>
                    <div className="glass p-8 rounded-3xl space-y-4">
                        <h3 className="font-bold text-lg border-b border-white/10 pb-2">Technical</h3>
                        <DetailRow label="Version" value={block.version} />
                        <DetailRow label="Bits" value={block.bits} />
                        <DetailRow label="Nonce" value={block.nonce} />
                        <DetailRow label="Previous Block" value={<span className="font-mono text-xs">{block.previousblockhash?.substring(0, 16)}...</span>} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-2xl font-bold">Transactions</h3>
                    <div className="glass rounded-3xl overflow-hidden">
                        {block.tx.map((txid: string) => (
                            <div
                                key={txid}
                                onClick={() => { setDetailId(txid); setView('tx-detail'); }}
                                className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-center gap-4"
                            >
                                <div className="p-2 bg-white/5 rounded-lg"><FileText size={16} /></div>
                                <span className="font-mono text-sm text-primary">{txid}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const TxDetailView = () => {
        const [tx, setTx] = useState<any>(null);
        useEffect(() => {
            if (detailId) rpc('gettransaction', [detailId]).then(setTx);
        }, [detailId]);

        if (!tx) return <div className="text-center py-20">Loading Transaction...</div>;

        return (
            <div className="max-w-5xl mx-auto space-y-8 py-10">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>

                <header>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Hash size={32} /></div>
                        <h1 className="text-4xl font-bold font-serif gold-text">Transaction</h1>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground break-all">{tx.txid}</p>
                </header>

                <div className="glass p-8 rounded-3xl space-y-4">
                    <h3 className="font-bold text-lg border-b border-white/10 pb-2">Details</h3>
                    <DetailRow label="Included In Block" value={
                        <span
                            className="font-mono text-primary cursor-pointer hover:underline"
                            onClick={() => { setDetailId(tx.blockhash); setView('block-detail'); }}
                        >
                            {tx.blockhash}
                        </span>
                    } />
                    <DetailRow label="Version" value={tx.version} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-bold text-xl">Inputs</h3>
                        {tx.vin.map((input: any, i: number) => (
                            <div key={i} className="glass p-4 rounded-xl">
                                {input.coinbase ? (
                                    <div>
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase rounded">Coinbase</span>
                                        <p className="font-mono text-xs mt-2 break-all text-muted-foreground">{input.coinbase}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm">Input data...</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-bold text-xl">Outputs</h3>
                        {tx.vout.map((output: any, i: number) => (
                            <div key={i} className="glass p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Index {output.n}</p>
                                    <p className="font-mono text-xs mt-1 text-primary">{output.scriptPubKey.asm?.substring(0, 20)}...</p>
                                </div>
                                <span className="font-bold text-xl">{output.value} <span className="text-sm font-serif text-primary">AUC</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const BlocksView = () => {
        const [blocks, setBlocks] = useState<any[]>([]);
        const [page, setPage] = useState(0);
        const PAGE_SIZE = 10;

        useEffect(() => {
            const load = async () => {
                const info = await rpc('getmininginfo');
                if (!info) return;

                const currentHeight = info.blocks;
                // Page 0: heights [current, current-9]
                // Page 1: heights [current-10, current-19]
                const start = currentHeight - (page * PAGE_SIZE);
                const end = Math.max(-1, start - PAGE_SIZE); // Stop before this index

                const list = [];
                for (let i = start; i > end; i--) {
                    if (i >= 0) {
                        const b = await rpc('getblock', [i]);
                        if (b) list.push(b);
                    }
                }
                setBlocks(list);
            };
            load();
        }, [page]);

        return (
            <div className="max-w-5xl mx-auto py-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold font-serif gold-text">Blocks</h1>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase transition-colors"
                        >
                            Newer
                        </button>
                        <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-mono text-muted-foreground">Page {page + 1}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase transition-colors"
                        >
                            Older
                        </button>
                    </div>
                </div>
                <div className="glass rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs uppercase font-bold text-muted-foreground">
                            <tr>
                                <th className="p-4">Height</th>
                                <th className="p-4">Hash</th>
                                <th className="p-4">Time</th>
                                <th className="p-4">Txns</th>
                                <th className="p-4">Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {blocks.map(b => (
                                <tr key={b.hash} onClick={() => { setDetailId(b.hash); setView('block-detail'); }} className="hover:bg-white/5 cursor-pointer transition-colors">
                                    <td className="p-4 font-bold text-primary">{b.height}</td>
                                    <td className="p-4 font-mono text-xs text-muted-foreground">{b.hash.substring(0, 20)}...</td>
                                    <td className="p-4 text-sm">{new Date(b.time * 1000).toLocaleString()}</td>
                                    <td className="p-4">{b.tx.length}</td>
                                    <td className="p-4 text-xs font-mono">{b.size}</td>
                                </tr>
                            ))}
                            {blocks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No blocks found in this range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const TransactionsView = () => {
        const [txs, setTxs] = useState<any[]>([]);
        const [page, setPage] = useState(0);
        const BLOCKS_PER_PAGE = 10; // Scan 10 blocks per "page" of history

        useEffect(() => {
            const load = async () => {
                const info = await rpc('getmininginfo');
                if (!info) return;

                const currentHeight = info.blocks;
                const start = currentHeight - (page * BLOCKS_PER_PAGE);
                const end = Math.max(-1, start - BLOCKS_PER_PAGE);

                const list = [];
                for (let i = start; i > end; i--) {
                    if (i >= 0) {
                        const b = await rpc('getblock', [i]);
                        if (b && b.tx) {
                            for (const txid of b.tx) {
                                list.push({
                                    txid,
                                    time: b.time,
                                    block: b.height,
                                    hash: b.hash
                                });
                            }
                        }
                    }
                }
                setTxs(list);
            };
            load();
        }, [page]);

        return (
            <div className="max-w-5xl mx-auto py-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold font-serif gold-text">Recent Transactions</h1>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase transition-colors"
                        >
                            Newer
                        </button>
                        <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-mono text-muted-foreground">Scan {page + 1}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase transition-colors"
                        >
                            Older
                        </button>
                    </div>
                </div>

                <div className="glass rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs uppercase font-bold text-muted-foreground">
                            <tr>
                                <th className="p-4">Tx Hash</th>
                                <th className="p-4">Block</th>
                                <th className="p-4">Time</th>
                                <th className="p-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {txs.map(t => (
                                <tr key={t.txid} onClick={() => { setDetailId(t.txid); setView('tx-detail'); }} className="hover:bg-white/5 cursor-pointer transition-colors">
                                    <td className="p-4 font-mono text-xs text-primary">{t.txid.substring(0, 32)}...</td>
                                    <td className="p-4 text-sm"><span className="px-2 py-1 bg-white/10 rounded text-xs font-bold">{t.block}</span></td>
                                    <td className="p-4 text-sm">{new Date(t.time * 1000).toLocaleString()}</td>
                                    <td className="p-4 text-right"><span className="text-green-400 text-xs font-bold uppercase">Confirmed</span></td>
                                </tr>
                            ))}
                            {txs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No transactions found in this block range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-center text-xs text-muted-foreground">Showing transactions from block #{Math.max(0, (miningInfo?.blocks || 0) - (page * 10))} down to #{Math.max(0, (miningInfo?.blocks || 0) - ((page + 1) * 10) + 1)}</p>
            </div>
        );
    }

    const NodesView = () => {
        return (
            <div className="max-w-5xl mx-auto py-10 space-y-8">
                <header>
                    <h1 className="text-4xl font-bold font-serif gold-text">Network Nodes</h1>
                    <p className="text-muted-foreground mt-2">Active participants in the Aurelis Republic Consensus.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-8 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">Local Imperial Node</h3>
                                <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Online • Mining</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <DetailRow label="Version" value="Aurelis Core v0.1.0" />
                            <DetailRow label="Protocol" value="70001" />
                            <DetailRow label="Connections" value="1 Outbound" />
                            <DetailRow label="Blocks Mined" value={miningInfo?.blocks || 0} />
                        </div>
                    </div>

                    <div className="glass p-8 rounded-3xl border-dashed border-white/20 flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                        <div className="p-4 rounded-full bg-white/5 text-muted-foreground">
                            <Globe size={32} />
                        </div>
                        <h3 className="font-bold text-lg">Global Peers</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            The peer discovery protocol is currently active. Additional imperial nodes will appear here as they join the network.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-primary/30 flex flex-col items-center">
            {/* Background Ambience */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-primary/5 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/5 blur-[150px] rounded-full"></div>
            </div>

            {/* Navbar */}
            <div className="w-full sticky top-0 z-50 flex justify-center backdrop-blur-xl border-b border-white/5 bg-black/50">
                <nav className="w-full max-w-6xl px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
                            <img src="/logo.png" alt="Aurelis" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] transition-transform group-hover:scale-110" />
                            <span className="font-serif font-black text-xl tracking-wider gold-text italic">AURELIS <span className="text-xs not-italic font-sans text-primary/60 ml-1 font-medium">EXPLORER</span></span>
                        </div>

                        <div className="hidden lg:flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5">
                            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
                            <NavButton active={view === 'blocks'} onClick={() => setView('blocks')}>Blocks</NavButton>
                            <NavButton active={view === 'transactions'} onClick={() => setView('transactions')}>Transactions</NavButton>
                            <NavButton active={view === 'nodes'} onClick={() => setView('nodes')}>Nodes</NavButton>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-wider text-primary shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                            <Zap size={10} fill="currentColor" /> Mainnet Beta
                        </div>
                    </div>
                </nav>
            </div>

            <AnimatePresence mode="wait">
                <motion.main
                    key={view + detailId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-5xl px-6 lg:px-8 py-8 lg:py-12 z-10 min-h-[80vh]"
                >
                    {view === 'dashboard' && <DashboardView />}
                    {view === 'blocks' && <BlocksView />}
                    {view === 'transactions' && <TransactionsView />}
                    {view === 'nodes' && <NodesView />}
                    {view === 'block-detail' && <BlockDetailView />}
                    {view === 'tx-detail' && <TxDetailView />}
                </motion.main>
            </AnimatePresence>

            {/* Footer */}
            <footer className="w-full border-t border-white/5 py-12 px-6 text-center z-10 bg-black/40 backdrop-blur-sm mt-auto">
                <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
                    <img src="/logo.png" alt="Aurelis" className="w-8 h-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500" />
                    <p className="text-xs text-muted-foreground font-medium tracking-wide">
                        Authorized by the Imperial Senate. <br />
                        <span className="opacity-50">Protocol v0.1.0-alpha • 2026 Republic of Aurelis</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}

const NavButton = ({ active, onClick, children }: any) => (
    <button
        onClick={onClick}
        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${active
            ? 'bg-primary text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]'
            : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
    >
        {children}
    </button>
);

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="glass p-6 rounded-[2rem] border-white/5 relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 ${color}`}></div>
        <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
            <div className={`p-2.5 rounded-xl bg-white/5 text-foreground`}>
                <Icon size={16} />
            </div>
        </div>
        <p className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">{value || '---'}</p>
    </div>
);

const DetailRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-3 border-b border-dashed border-white/10 last:border-0">
        <span className="text-sm text-muted-foreground font-semibold">{label}</span>
        <span className="text-sm font-medium font-mono text-primary/80">{value}</span>
    </div>
);
