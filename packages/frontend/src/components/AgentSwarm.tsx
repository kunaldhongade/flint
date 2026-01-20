'use client';

import { useState } from 'react';

type AgentType = 'Conservative' | 'Neutral' | 'Aggressive';

interface AgentState {
    id: AgentType;
    status: 'idle' | 'analyzing' | 'voting' | 'complete';
    decision?: 'approve' | 'reject';
    confidence: number;
    message: string;
}

export function AgentSwarm() {
    const [agents, setAgents] = useState<AgentState[]>([
        { id: 'Conservative', status: 'idle', confidence: 0, message: 'Waiting for task...' },
        { id: 'Neutral', status: 'idle', confidence: 0, message: 'Waiting for task...' },
        { id: 'Aggressive', status: 'idle', confidence: 0, message: 'Waiting for task...' },
    ]);

    const [consensus, setConsensus] = useState<{ status: string; score: number } | null>(null);

    const startSimulation = () => {
        // Reset
        setAgents(prev => prev.map(a => ({ ...a, status: 'analyzing', message: 'Analyzing risk parameters...' })));
        setConsensus(null);

        // Simulate Agent 1 (Conservative)
        setTimeout(() => {
            setAgents(prev => prev.map(a => a.id === 'Conservative' ? {
                ...a, status: 'voting', decision: 'approve', confidence: 95, message: 'Risk profile acceptable. Volatility < 5%.'
            } : a));
        }, 1500);

        // Simulate Agent 2 (Neutral)
        setTimeout(() => {
            setAgents(prev => prev.map(a => a.id === 'Neutral' ? {
                ...a, status: 'voting', decision: 'approve', confidence: 92, message: 'Balanced upside detected. Yield > 4%.'
            } : a));
        }, 2500);

        // Simulate Agent 3 (Aggressive)
        setTimeout(() => {
            setAgents(prev => prev.map(a => a.id === 'Aggressive' ? {
                ...a, status: 'voting', decision: 'approve', confidence: 88, message: 'High yield opportunity. Momentum positive.'
            } : a));
        }, 3500);

        // Consensus
        setTimeout(() => {
            setAgents(prev => prev.map(a => ({ ...a, status: 'complete' })));
            setConsensus({ status: 'APPROVED', score: 91.6 });
        }, 4500);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-900 p-6 rounded-lg border border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Swarm Intelligence Consensus</h2>
                    <p className="text-gray-400 text-sm">Real-time visualization of multi-agent governance.</p>
                </div>
                <button
                    onClick={startSimulation}
                    className="bg-flare-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold transition-all shadow-[0_0_15px_rgba(234,42,106,0.5)]"
                >
                    Simulate Analysis
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <div key={agent.id} className={`
            glass-panel relative p-6 rounded-xl transition-all duration-500 transform
            ${agent.status === 'idle' ? 'border-gray-700 opacity-70' : 'scale-105 opacity-100'}
            ${agent.status === 'analyzing' ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}
            ${agent.status === 'voting' || agent.status === 'complete' ?
                            (agent.decision === 'approve' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]') : ''}
          `}>
                        {/* Connecting Line (Pseudo-element approach via CSS or simple visual cue) */}
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 text-xs text-gray-500 font-mono uppercase tracking-widest">
                            {agent.status}
                        </div>

                        {/* Agent Icon/Avatar Placeholder */}
                        <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-2">
                            <h3 className={`text-xl font-bold ${agent.id === 'Conservative' ? 'text-cyan-400' :
                                    agent.id === 'Neutral' ? 'text-magenta-400' : 'text-orange-400'
                                }`}>{agent.id}</h3>
                            {agent.status === 'complete' && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${agent.decision === 'approve' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                    }`}>
                                    {agent.decision}
                                </span>
                            )}
                        </div>

                        <div className="h-24 flex items-center justify-center text-center">
                            <p className="text-gray-300 text-sm italic font-mono leading-relaxed">
                                <span className="text-gray-600 mr-2">{'>'}</span>
                                {agent.message}
                                <span className="animate-pulse ml-0.5">_</span>
                            </p>
                        </div>

                        {/* Confidence Meter */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono uppercase">
                                <span>Confidence</span>
                                <span className="text-white">{agent.confidence}%</span>
                            </div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${agent.confidence > 90 ? 'bg-green-500 text-green-500' :
                                            agent.confidence > 70 ? 'bg-cyan-500 text-cyan-500' : 'bg-orange-500 text-orange-500'
                                        }`}
                                    style={{ width: `${agent.confidence}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Final Consensus Output */}
            {consensus && (
                <div className="mt-8 p-6 bg-green-900/20 border border-green-500 rounded-lg text-center animate-fade-in-up">
                    <h3 className="text-2xl font-bold text-green-400 mb-2">CONSENSUS REACHED: {consensus.status}</h3>
                    <p className="text-green-200">
                        Overall Confidence Score: <span className="font-mono text-xl">{consensus.score.toFixed(1)}%</span>
                    </p>
                    <div className="mt-4 text-xs text-gray-400 font-mono">
                        Attestation Hash: 0x{Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}
                    </div>
                </div>
            )}
        </div>
    );
}
