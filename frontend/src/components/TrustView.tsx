import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Activity, CheckCircle, Clock, ExternalLink, Link as LinkIcon, Lock, Search, Shield, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import AIDecisionRegistryArtifact from '../abis/AIDecisionRegistry.json';

const LOGGER_ADDRESS = "0x31D4EDfF56142b770C4011B868c96127006738D1";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

const TrustView: React.FC = () => {
    const [idInput, setIdInput] = useState('');
    const [searchId, setSearchId] = useState<`0x${string}` | null>(null);
    const [ipfsData, setIpfsData] = useState<any>(null);
    const [isFetchingIpfs, setIsFetchingIpfs] = useState(false);

    const { data: decisionData, isError, isLoading: isContractLoading } = useReadContract({
        address: LOGGER_ADDRESS as `0x${string}`,
        abi: AIDecisionRegistryArtifact.abi,
        functionName: 'decisions',
        args: searchId ? [searchId] : undefined,
        query: {
            enabled: !!searchId
        }
    });

    const { data: isRegistered } = useReadContract({
        address: LOGGER_ADDRESS as `0x${string}`,
        abi: AIDecisionRegistryArtifact.abi,
        functionName: 'isRegistered',
        args: searchId ? [searchId] : undefined,
        query: {
            enabled: !!searchId
        }
    });

    // Fetch from IPFS when decisionData is ready
    React.useEffect(() => {
        if (decisionData && (decisionData as any)[2]) {
            const cid = (decisionData as any)[2];
            if (cid) {
                setIsFetchingIpfs(true);
                fetch(`${IPFS_GATEWAY}${cid}`)
                    .then(res => res.json())
                    .then(data => {
                        setIpfsData(data);
                        setIsFetchingIpfs(false);
                    })
                    .catch(err => {
                        console.error("Failed to fetch IPFS data", err);
                        setIsFetchingIpfs(false);
                    });
            }
        } else {
            setIpfsData(null);
        }
    }, [decisionData]);

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idInput.trim()) return;

        // Formate UUID to bytes32 compatible
        const cleanUuid = idInput.replace(/-/g, '');
        setSearchId(`0x${cleanUuid.padEnd(64, '0')}`);
    };

    const isLoading = isContractLoading;

    const registrationTxHash = searchId ? localStorage.getItem(`flint_tx_${idInput.trim()}`) : null;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto scroll-smooth p-6">
                <div className="max-w-2xl w-full mx-auto space-y-8 mt-12 mb-20 animate-in fade-in duration-500">
                    <div className="text-center space-y-6 flex flex-col items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#FAF3E1] mb-2">Trust Verification Center</h1>
                            <p className="text-neutral-400 max-w-lg mx-auto">
                                Verify any AI decision against the immutable Flare Data Connector logs.
                            </p>
                        </div>
                    </div>

                    <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <form onSubmit={handleVerify} className="flex gap-2 items-center bg-neutral-950/50 p-1.5 rounded-xl border border-neutral-800 focus-within:border-[#FA8112]/50 transition-colors">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                                    <Input
                                        placeholder="Enter Decision ID (UUID)..."
                                        className="pl-10 bg-transparent border-none text-[#FAF3E1] placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 shadow-none text-base"
                                        value={idInput}
                                        onChange={(e) => setIdInput(e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading || !idInput}
                                    className="bg-[#FA8112] hover:bg-[#d96d0d] text-white min-w-[100px] rounded-lg transition-all shadow-lg shadow-[#FA8112]/20"
                                >
                                    {isLoading ? "Verifying..." : "Verify"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {!!searchId && !isLoading && !isRegistered && (
                        <Card className="bg-red-500/5 border-red-500/20">
                            <CardContent className="p-6 flex flex-col items-center gap-2">
                                <XCircle className="w-8 h-8 text-red-500" />
                                <h3 className="text-[#FAF3E1] font-medium text-lg">Decision Not Found</h3>
                                <p className="text-neutral-400 text-sm text-center">
                                    The decision ID you entered is not registered on-chain.
                                    It might still be processing or failed to sync.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!!searchId && !isLoading && !!isRegistered && !!decisionData && (
                        <Card className="bg-[#FA8112]/5 border-[#FA8112]/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <CardHeader className="border-b border-[#FA8112]/10 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[#FA8112]">
                                        <CheckCircle className="w-5 h-5 shadow-sm" />
                                        <CardTitle className="text-lg text-[#FAF3E1]">Verified On-Chain</CardTitle>
                                    </div>
                                    <div className="flex gap-2">
                                        {isFetchingIpfs && (
                                            <span className="text-[10px] text-neutral-500 animate-pulse font-mono tracking-widest">
                                                FETCHING IPFS...
                                            </span>
                                        )}
                                        <span className="text-xs font-mono text-[#FA8112]/90 bg-[#FA8112]/10 px-2 py-1 rounded border border-[#FA8112]/20 shadow-sm animate-pulse">
                                            IMMUTABLE
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 transition-colors hover:border-neutral-700/50 group">
                                        <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1 group-hover:text-neutral-400">
                                            <Clock className="w-3 h-3" /> Timestamp
                                        </div>
                                        <div className="text-neutral-200 text-sm font-mono">
                                            {new Date(Number((decisionData as any)[6]) * 1000).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 transition-colors hover:border-neutral-700/50 group">
                                        <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1 group-hover:text-neutral-400">
                                            <Lock className="w-3 h-3" /> Subject
                                        </div>
                                        <div className="text-neutral-200 text-sm font-mono truncate" title={(decisionData as any)[5]}>
                                            {(decisionData as any)[5]}
                                        </div>
                                    </div>
                                </div>

                                {ipfsData && (
                                    <div className="p-4 bg-neutral-950/50 rounded-lg border border-[#FA8112]/10 space-y-4 shadow-inner">
                                        <div className="flex items-center gap-2 text-[#FA8112] text-[10px] font-bold uppercase tracking-[0.2em]">
                                            <Shield className="w-3.5 h-3.5" /> IPFS Audit Log Content
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-tighter flex items-center gap-1">
                                                    AI Reasoning <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                                </span>
                                                <p className="text-neutral-300 text-xs leading-relaxed italic mt-1 line-clamp-4">
                                                    "{ipfsData.ai_response}"
                                                </p>
                                            </div>
                                            <div className="flex justify-between border-t border-neutral-800/50 pt-3">
                                                <div>
                                                    <span className="text-[10px] text-neutral-500 uppercase">Agent Domain</span>
                                                    <div className="text-[#FAF3E1] text-xs font-bold">{ipfsData.domain || 'DeFi'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-neutral-500 uppercase">Consensus</span>
                                                    <div className="text-green-400 text-xs font-bold tracking-widest flex items-center gap-1 justify-end">
                                                        VERIFIED <CheckCircle className="w-2.5 h-2.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {ipfsData.execution_tx_hashes && ipfsData.execution_tx_hashes.length > 0 && (
                                                <div className="border-t border-neutral-800/50 pt-3 space-y-2">
                                                    <span className="text-[10px] text-neutral-500 uppercase tracking-tighter flex items-center gap-1">
                                                        Execution Transactions <ExternalLink className="w-2 h-2" />
                                                    </span>
                                                    <div className="flex flex-col gap-1.5">
                                                        {ipfsData.execution_tx_hashes.map((tx: string, i: number) => (
                                                            <a
                                                                key={i}
                                                                href={`https://testnet.flarescan.com/tx/${tx}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 text-[#FA8112] hover:text-[#d96d0d] transition-colors text-[11px] font-mono group/tx"
                                                            >
                                                                <div className="p-1 rounded bg-[#FA8112]/10 group-hover/tx:bg-[#FA8112]/20">
                                                                    <Activity className="w-2.5 h-2.5" />
                                                                </div>
                                                                <span className="truncate">{tx}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="border-t border-neutral-800/50 pt-3 space-y-2">
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-tighter flex items-center gap-1">
                                                    Technical Audit Data (Full JSON) <Shield className="w-2 h-2" />
                                                </span>
                                                <div className="max-h-[200px] overflow-y-auto bg-black/40 p-2 rounded border border-white/5">
                                                    <pre className="text-[10px] text-neutral-400 font-mono whitespace-pre-wrap break-all">
                                                        {JSON.stringify(ipfsData, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 overflow-hidden group">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-2">
                                        <LinkIcon className="w-3 h-3" /> Decision ID (Hash)
                                    </div>
                                    <code className="text-[#FA8112] text-[10px] break-all leading-tight block bg-black/30 p-2 rounded border border-white/5">
                                        {(decisionData as any)[0]}
                                    </code>
                                </div>

                                <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 overflow-hidden">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-2">
                                        <Shield className="w-3 h-3" /> IPFS CID
                                    </div>
                                    <code className="text-neutral-400 text-[10px] break-all italic block">
                                        {(decisionData as any)[2]}
                                    </code>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800/50">
                                    <a
                                        href={`https://testnet.flarescan.com/address/${LOGGER_ADDRESS}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-all border border-white/5"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Review Registry Contrat
                                    </a>
                                    {registrationTxHash ? (
                                        <a
                                            href={`https://testnet.flarescan.com/tx/${registrationTxHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FA8112] hover:bg-[#d96d0d] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#FA8112]/20"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            View Registration Tx
                                        </a>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-900 text-neutral-600 rounded-xl text-[10px] border border-white/5 cursor-not-allowed italic">
                                            Tx Hash Not Cached Locally
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrustView;
