import { Switch } from '@/components/ui/switch';
import { Activity, Globe, Lock, Settings, Stethoscope } from 'lucide-react';
import React from 'react';

export type Domain = 'DeFi' | 'Medical' | 'Security' | 'Custom';

interface ControlPanelProps {
    currentDomain: Domain;
    onDomainChange: (domain: Domain) => void;
    executionEnabled: boolean;
    onExecutionToggle: (enabled: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    currentDomain,
    onDomainChange,
    executionEnabled,
    onExecutionToggle
}) => {

    const domains: { id: Domain; icon: React.ReactNode; label: string }[] = [
        { id: 'DeFi', icon: <Globe className="w-3.5 h-3.5" />, label: 'DeFi' },
        { id: 'Medical', icon: <Stethoscope className="w-3.5 h-3.5" />, label: 'Medical' },
        { id: 'Security', icon: <Lock className="w-3.5 h-3.5" />, label: 'Security' },
        { id: 'Custom', icon: <Settings className="w-3.5 h-3.5" />, label: 'Custom' },
    ];

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-neutral-900/50 border-b border-white/5 backdrop-blur-sm sticky top-0 z-30">

            {/* Domain Selector */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-2 hidden sm:block">Domain:</span>
                <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800">
                    {domains.map((d) => (
                        <button
                            key={d.id}
                            onClick={() => onDomainChange(d.id)}
                            className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                            ${currentDomain === d.id
                                    ? 'bg-neutral-800 text-[#FAF3E1] shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                                }
                        `}
                        >
                            {d.icon}
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Execution Toggle */}
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-800">
                <div className="flex flex-col items-end">
                    <span className={`text-xs font-semibold ${executionEnabled ? 'text-[#FA8112]' : 'text-neutral-500'}`}>
                        {executionEnabled ? 'Execution ON' : 'Log Only'}
                    </span>
                    <span className="text-[10px] text-neutral-600 hidden sm:block">
                        {executionEnabled ? 'Tx & Logging' : 'Verifiable Log'}
                    </span>
                </div>
                <Switch
                    checked={executionEnabled}
                    onCheckedChange={onExecutionToggle}
                    className="data-[state=checked]:bg-[#FA8112]"
                />
            </div>

        </div>
    );
};
