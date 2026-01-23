import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Check, Loader2, Play, Shield } from 'lucide-react';
import React, { useState } from 'react';

export interface StrategyStep {
    id: string;
    protocol: string;
    action: string;
    amount: string;
    status: 'pending' | 'ready' | 'executing' | 'completed' | 'failed';
    txHash?: string;
}

interface ExecutionStrategyPanelProps {
    steps: StrategyStep[];
    onExecute: (stepId: string) => void;
    isExecuting: boolean;
}

export const ExecutionStrategyPanel: React.FC<ExecutionStrategyPanelProps> = ({ steps, onExecute, isExecuting }) => {
    return (
        <div className="mt-4 border border-neutral-700 rounded-xl overflow-hidden bg-neutral-900 shadow-xl">
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <h3 className="text-sm font-semibold text-white">Execution Strategy</h3>
                </div>
                <span className="text-xs text-neutral-400">{steps.filter(s => s.status === 'completed').length} / {steps.length} Steps</span>
            </div>

            <div className="divide-y divide-neutral-800">
                {steps.map((step, index) => (
                    <div key={step.id} className="p-4 flex items-center justify-between group hover:bg-neutral-800/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors
                ${step.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                    step.status === 'executing' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                        'bg-neutral-800 border-neutral-700 text-neutral-500'}
              `}>
                                {step.status === 'completed' ? <Check className="w-4 h-4" /> :
                                    step.status === 'executing' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                        <span className="text-xs font-mono">{index + 1}</span>}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-neutral-200">{step.action}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">{step.protocol}</span>
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5 font-mono">{step.amount}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {step.status === 'ready' && (
                                <Button
                                    size="sm"
                                    onClick={() => onExecute(step.id)}
                                    disabled={isExecuting}
                                    className="bg-blue-600 hover:bg-blue-500 text-white border-none h-8 text-xs font-medium"
                                >
                                    {isExecuting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                                    Execute
                                </Button>
                            )}

                            {step.status === 'completed' && step.txHash && (
                                <a
                                    href={`https://testnet.flarescan.com/tx/${step.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-neutral-500 hover:text-blue-400 underline decoration-neutral-700 underline-offset-2"
                                >
                                    View Tx
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
