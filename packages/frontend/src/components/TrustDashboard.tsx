'use client';

import { useEffect, useState } from 'react';

export function TrustDashboard() {
    // In a real app, these would come from an API
    const metrics = {
        activeEnclaves: 3,
        totalVerifiedDecisions: 1243,
        consensusHealth: 99.8,
        lastAttestation: '2 mins ago',
    };

    const [logs, setLogs] = useState<string[]>([
        '[TEE] Enclave sgx-1 initialized ephemeral identity',
        '[RISK] Agent-01 fetching FTSO price for FLR/USD...',
        '[BLOCKCHAIN] Decision #0x8f2... logged on block 1928374',
        '[CONSENSUS] Weighted agreement reached (Confidence: 98.2%)',
    ]);

    useEffect(() => {
        // Simulate live logs
        const interval = setInterval(() => {
            const newLogs = [
                `[${new Date().toLocaleTimeString()}] System heartbeat check: OK`,
                ...logs.slice(0, 4)
            ];
            setLogs(newLogs);
        }, 5000);
        return () => clearInterval(interval);
    }, [logs]);

    return (
        <div className="space-y-6">
            {/* High-Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-green-500 hover:neon-border transition-all duration-300">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Enclaves</h3>
                    <p className="text-3xl font-bold mt-2 text-white text-glow">{metrics.activeEnclaves}</p>
                    <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-full mt-2 inline-block border border-green-500/30">
                        ● All Trusted
                    </span>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyan-500 hover:neon-border transition-all duration-300">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verified Decisions</h3>
                    <p className="text-3xl font-bold mt-2 text-white text-glow">{metrics.totalVerifiedDecisions.toLocaleString()}</p>
                    <span className="text-xs text-cyan-400 mt-2 block font-mono">Total Executions</span>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-magenta-500 hover:neon-border transition-all duration-300">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consensus Health</h3>
                    <p className="text-3xl font-bold mt-2 text-white text-glow">{metrics.consensusHealth}%</p>
                    <span className="text-xs font-bold text-magenta-400 bg-magenta-900/30 px-2 py-1 rounded-full mt-2 inline-block border border-magenta-500/30">
                        ♥ Optimal
                    </span>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-orange-500 hover:neon-border transition-all duration-300">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Attestation</h3>
                    <p className="text-3xl font-bold mt-2 text-white text-glow">{metrics.lastAttestation}</p>
                    <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-2 py-1 rounded-full mt-2 inline-block border border-orange-500/30">
                        ⚡ Live
                    </span>
                </div>
            </div>

            {/* Live System Feed */}
            <div className="bg-black text-green-400 p-6 rounded-lg shadow font-mono text-sm h-64 overflow-hidden relative">
                <div className="absolute top-4 right-4 animate-pulse">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                </div>
                <h3 className="text-gray-500 mb-4 uppercase tracking-widest border-b border-gray-800 pb-2">
                    System Live Feed
                </h3>
                <div className="space-y-2">
                    {logs.map((log, i) => (
                        <div key={i} className="opacityjs-0 animate-fade-in-down">
                            <span className="mr-2 text-gray-600">{'>'}</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
