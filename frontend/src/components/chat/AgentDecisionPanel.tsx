import { AlertCircle, CheckCircle, User, XCircle } from 'lucide-react';
import React from 'react';

interface AgentVote {
    name: string;
    role: 'Conservative' | 'Neutral' | 'Aggressive';
    decision: 'approve' | 'reject';
    reason: string;
}

interface AgentDecisionPanelProps {
    agents: AgentVote[];
    consensusScore: string; // e.g. "2/3"
}

export const AgentDecisionPanel: React.FC<AgentDecisionPanelProps> = ({ agents, consensusScore }) => {
    return (
        <div className="mt-4 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/30">
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-200">Multi-Agent Consensus</h3>
                <div className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Approval: {consensusScore}
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 gap-3">
                {agents.map((agent, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold
              ${agent.role === 'Conservative' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                                agent.role === 'Aggressive' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                                    'border-neutral-500/30 bg-neutral-500/10 text-neutral-400'
                            }
            `}>
                            {agent.role[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium text-neutral-300">{agent.role} Agent</span>
                                {agent.decision === 'approve' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                        <CheckCircle className="w-3 h-3" /> Approved
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                                        <XCircle className="w-3 h-3" /> Rejected
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                {agent.reason}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
