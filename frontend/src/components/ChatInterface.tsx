import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Lottie from 'lottie-react';
import { CheckCircle, Clock, FileText, MessageSquare, Shield, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAccount, useWalletClient } from 'wagmi';
import AIDecisionRegistryArtifact from '../abis/AIDecisionRegistry.json';
import chatRobot from '../assets/chat_robot.json';
import { useError } from '../lib/ErrorContext';
import { useGlobalUI } from '../lib/GlobalUIContext';
import { AgentDecisionPanel } from './chat/AgentDecisionPanel';
import { ChatInput } from './chat/ChatInput';
import { ChatSuggestions } from './chat/ChatSuggestions';
import { ControlPanel, Domain } from './chat/ControlPanel';
import { ExecutionStrategyPanel, StrategyStep } from './chat/ExecutionStrategyPanel';
import { ModelResultReviewPanel } from './chat/ModelResultReviewPanel';
import { TrustProofPanel } from './chat/TrustProofPanel';
import { VerificationProgressModal } from './ui/VerificationProgressModal';


// --- Types ---

interface AgentVote {
  name: string;
  role: 'Conservative' | 'Neutral' | 'Aggressive';
  decision: 'approve' | 'reject';
  reason: string;
}

interface TrustProof {
  decisionId: string;
  decisionHash: string;
  txHash?: string;
  ipfsCid?: string;
  timestamp: number;
}

interface Message {
  text: string;
  type: 'user' | 'bot';
  imageData?: string;
  fileName?: string;
  isTyping?: boolean;
  agentVotes?: AgentVote[];
  consensusScore?: string;
  trustProof?: TrustProof;
  strategySteps?: StrategyStep[];
  selectedVote?: string; // Track which model was selected
  suggestions?: string[];
}

interface StatusState {
  message: string;
  subMessage?: string;
  type: 'loading' | 'success' | 'error' | 'info';
}

const BACKEND_ROUTE = "/api/routes/chat/";

/* import { useSearchParams } from 'react-router'; */
import { useSearchParams } from 'react-router';
import { getSessions, saveSession } from '../lib/chatHistory';

const ChatInterface: React.FC = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "I am Flint, your verifiable DeFi assistant.\n\nEverything I do is debated by multiple AI agents and cryptographically proved on the Flare Network. How can I help you today?",
      type: 'bot',
      isTyping: false
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const { showError } = useError();

  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [domain, setDomain] = useState<Domain>('DeFi');
  const [executionEnabled, setExecutionEnabled] = useState<boolean>(true);
  const [pendingDecision, setPendingDecision] = useState<{ packet: any, loggerAddress: string } | null>(null);
  const [verificationSteps, setVerificationSteps] = useState<Array<{ id: string; label: string; status: 'pending' | 'loading' | 'success' | 'error'; detail?: string; hash?: string }>>([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ decisionId?: string; txHash?: string; ipfsCid?: string }>({});
  const { openModelSelector, openFilePreview } = useGlobalUI();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load selected models from localStorage on mount
  useEffect(() => {
    const savedModels = localStorage.getItem('flint_selected_models');
    if (savedModels) {
      try {
        setSelectedModels(JSON.parse(savedModels));
      } catch (e) {
        console.error('Failed to load saved models', e);
      }
    }
  }, []);

  // Load Session
  useEffect(() => {
    if (sessionId) {
      const sessions = getSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setMessages(session.messages);
        return;
      }
    }
    // Default start if no session or new - clear temp count
    localStorage.setItem('flint_temp_message_count', '1');
    setMessages([{
      text: "I am Flint, your verifiable DeFi assistant.\n\nEverything I do is debated by multiple AI agents and cryptographically proved on the Flare Network. How can I help you today?",
      type: 'bot',
      isTyping: false
    }]);
  }, [sessionId]);

  // Save Session
  useEffect(() => {
    if (messages.length > 1) { // Only save if interaction happened
      const currentId = sessionId || crypto.randomUUID();

      // If it's a new session, we need to update URL without reload
      if (!sessionId) {
        setSearchParams({ session: currentId }, { replace: true });
      }

      const title = messages.find(m => m.type === 'user')?.text.slice(0, 30) || "New Strategy";

      saveSession({
        id: currentId,
        title: title + (title.length >= 30 ? '...' : ''),
        date: new Date().toISOString(),
        messages,
        updatedAt: Date.now()
      });
    }
  }, [messages, sessionId]);

  // Track message count for New Strategy button
  useEffect(() => {
    localStorage.setItem('flint_temp_message_count', messages.length.toString());
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // --- Helpers ---

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const updateLastMessage = (updates: Partial<Message>) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
      return newMessages;
    });
  };

  // --- On-Chain Logic (Preserved & Adapted) ---

  const logDecisionOnChain = async (packet: any, loggerAddress: string, silent: boolean = false) => {
    if (!walletClient || !packet) return;

    if (!silent) {
      setStatus({
        message: "Registering Decision",
        subMessage: "Logging to AIDecisionRegistry...",
        type: "loading"
      });
    }

    try {
      const cleanUuid = packet.decision_id.replace(/-/g, '');
      const decisionIdBytes32 = `0x${cleanUuid.padEnd(64, '0')}`;

      // New parameters for AIDecisionRegistry
      const ipfsCidHash = packet.ipfs_cid_hash?.startsWith('0x') ? packet.ipfs_cid_hash : `0x${packet.ipfs_cid_hash || '0'.repeat(64)}`;
      const ipfsCid = packet.ipfs_cid || "";
      const domainHash = packet.domain_hash?.startsWith('0x') ? packet.domain_hash : `0x${packet.domain_hash || '0'.repeat(64)}`;
      const chosenModelHash = packet.chosen_model_hash?.startsWith('0x') ? packet.chosen_model_hash : `0x${packet.chosen_model_hash || '0'.repeat(64)}`;
      const subject = packet.subject || "AI Decision";

      const args = [
        decisionIdBytes32,
        ipfsCidHash,
        ipfsCid,
        domainHash,
        chosenModelHash,
        subject
      ];

      const hash = await walletClient.writeContract({
        address: loggerAddress as `0x${string}`,
        abi: AIDecisionRegistryArtifact.abi,
        functionName: 'registerDecision',
        args: args
      });

      if (!silent) {
        setStatus({
          message: "Decision Registered",
          subMessage: "Waiting for confirmation...",
          type: "loading"
        });
      }

      // Simple wait (in a real app, use waitForTransaction)
      await new Promise(r => setTimeout(r, 4000));

      return hash;
    } catch (error: any) {
      console.error("Failed to register decision:", error);
      setStatus({
        message: "Registration Failed (Non-blocking)",
        subMessage: "Proceeding with chat...",
        type: "error"
      });
      // Don't throw, allow user to continue
      return null;
    }
  };

  const executeStrategyStep = async (stepId: string, txData: any) => {
    if (!walletClient) return;

    setExecutingStepId(stepId);
    setStatus({ message: "Executing Step", subMessage: "Please sign in wallet", type: "loading" });

    try {
      const formattedTx = {
        to: txData.to as `0x${string}`,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || '0'),
        gas: BigInt(txData.gas || '300000'), // Default fallback
        ...(txData.nonce ? { nonce: Number(txData.nonce) } : {}),
        chainId: Number(txData.chainId || '0')
      };

      const hash = await walletClient.sendTransaction(formattedTx);

      setStatus({ message: "Transaction Sent", subMessage: `Tx: ${hash.slice(0, 10)}...`, type: "success" });
      setTimeout(() => setStatus(null), 3000);

      // Update the specific message's strategy steps to mark as completed
      setMessages(prev => prev.map(msg => {
        if (!msg.strategySteps) return msg;
        return {
          ...msg,
          strategySteps: msg.strategySteps.map(s =>
            s.id === stepId ? { ...s, status: 'completed', txHash: hash } : s
          )
        };
      }));

    } catch (error: any) {
      console.error("Execution failed:", error);
      setStatus({ message: "Execution Failed", subMessage: error.message, type: "error" });
      showError({ message: "Transaction Execution Failed", detail: error.message });
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setExecutingStepId(null);
    }
  };

  const handleModelSelection = (msgIndex: number, modelName: string) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[msgIndex] = {
        ...newMsgs[msgIndex],
        selectedVote: modelName,
      };
      return newMsgs;
    });
  };

  const handleOpenModelSelector = () => {
    openModelSelector(selectedModels || [], handleConfirmModels);
  };

  const handleConfirmModels = (models: string[]) => {
    setSelectedModels(models);
    // Save to localStorage
    localStorage.setItem('flint_selected_models', JSON.stringify(models));
  };

  // --- API Interaction ---

  const handleSend = async (text: string, file: File | null) => {
    // 1. Add User Message
    const userMsg: Message = { text, type: 'user' };
    if (file) {
      userMsg.fileName = file.name;
      if (file.type.startsWith('image/')) {
        userMsg.imageData = URL.createObjectURL(file);
      }
    }
    addMessage(userMsg);
    setIsLoading(true);

    try {
      // 2. Add placeholder Bot Message
      addMessage({ text: "Thinking...", type: "bot", isTyping: true });

      const formData = new FormData();
      formData.append("message", text);
      formData.append("walletAddress", address || "");
      if (file) formData.append("image", file);

      const response = await fetch(BACKEND_ROUTE, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("API Error");
      const data = await response.json();

      if (data.decision_packet && data.decision_logger_address) {
        setPendingDecision({ packet: data.decision_packet, loggerAddress: data.decision_logger_address });
      }

      setStatus(null);

      // 4. Construct Final Message
      // Only show agent votes if explicitly returned from backend (e.g., when using model selector)
      const agentVotes: AgentVote[] | undefined = data.agent_votes;

      // Parse Strategy Steps
      let strategySteps: StrategyStep[] = [];
      if (data.transactions) {
        try {
          const txs = JSON.parse(data.transactions);
          strategySteps = txs.map((t: any, i: number) => ({
            id: `step-${Date.now()}-${i}`,
            protocol: 'Flare',
            action: t.description || 'Transaction',
            amount: t.amount, // Extract if possible
            status: 'ready',
            txData: t.tx || t // Store raw tx data for execution
          }));
        } catch (e) { console.error("Error parsing txs", e); }
      }

      const trustProof: TrustProof | undefined = data.decision_packet ? {
        decisionId: data.decision_packet.decision_id,
        decisionHash: data.decision_packet.decision_hash,
        timestamp: data.decision_packet.timestamp * 1000
      } : undefined;

      updateLastMessage({
        text: data.response,
        isTyping: false,
        agentVotes: agentVotes, // Only include if present
        consensusScore: agentVotes ? `${agentVotes.filter(v => v.decision === 'approve').length}/${agentVotes.length}` : undefined,
        trustProof,
        strategySteps: strategySteps.length > 0 ? strategySteps : undefined,
        suggestions: data.suggestions
      });

    } catch (error: any) {
      console.error(error);
      updateLastMessage({ text: "Sorry, I encountered an error processing your request.", isTyping: false });
      setStatus({ message: "Error", type: "error" });
      showError({ message: "Chat interaction failed", detail: error.message || String(error) });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!pendingDecision) return;

    // Initialize steps
    const steps = [
      { id: 'ipfs', label: 'Uploading to IPFS', status: 'pending' as const, detail: 'Storing decision metadata...' },
      { id: 'contract', label: 'Logging on-chain', status: 'pending' as const, detail: 'Creating verifiable proof...' },
      { id: 'complete', label: 'Verification Complete', status: 'pending' as const, detail: 'Decision indexed successfully' }
    ];

    setVerificationSteps(steps);
    setShowVerificationModal(true);
    setIsLoading(true);

    try {
      // Step 1: Upload to IPFS
      setVerificationSteps(prev => prev.map(s => s.id === 'ipfs' ? { ...s, status: 'loading' } : s));

      const lastBotMsg = [...messages].reverse().find(m => m.type === 'bot');

      // Collect any execution transaction hashes
      const executionTxHashes = lastBotMsg?.strategySteps
        ?.filter(s => s.status === 'completed' && s.txHash)
        .map(s => s.txHash) || [];

      const trailData = {
        decision_id: pendingDecision.packet.decision_id,
        user_input: pendingDecision.packet.input_summary,
        ai_response: lastBotMsg?.text,
        agent_votes: lastBotMsg?.agentVotes,
        execution_tx_hashes: executionTxHashes,
        timestamp: pendingDecision.packet.timestamp,
        domain: domain
      };

      const confirmResponse = await fetch("/api/routes/chat/confirm_decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_trail: trailData })
      });

      if (!confirmResponse.ok) throw new Error("IPFS Upload Failed");
      const confirmData = await confirmResponse.json();

      setVerificationSteps(prev => prev.map(s =>
        s.id === 'ipfs' ? { ...s, status: 'success', hash: confirmData.ipfs_cid } : s
      ));

      const updatedPacket = {
        ...pendingDecision.packet,
        ipfs_cid_hash: confirmData.cid_hash || pendingDecision.packet.ipfs_cid_hash,
        ipfs_cid: confirmData.ipfs_cid
      };

      // Step 2: Log on-chain
      setVerificationSteps(prev => prev.map(s => s.id === 'contract' ? { ...s, status: 'loading' } : s));

      const hash = await logDecisionOnChain(updatedPacket, pendingDecision.loggerAddress, true);

      if (hash) {
        setVerificationSteps(prev => prev.map(s =>
          s.id === 'contract' ? { ...s, status: 'success', hash } : s
        ));

        // Step 3: Complete
        setVerificationSteps(prev => prev.map(s =>
          s.id === 'complete' ? { ...s, status: 'success' } : s
        ));

        // Store hash in localStorage for TrustView to pick up
        localStorage.setItem(`flint_tx_${pendingDecision.packet.decision_id}`, hash);

        // Update messages with trust proof
        setMessages(prev => {
          const newMsgs = [...prev];
          const targetMsg = [...newMsgs].reverse().find(m => m.type === 'bot');
          if (targetMsg) {
            targetMsg.trustProof = {
              decisionId: pendingDecision.packet.decision_id,
              decisionHash: pendingDecision.packet.decision_hash,
              ipfsCid: confirmData.ipfs_cid,
              timestamp: pendingDecision.packet.timestamp * 1000,
              txHash: hash
            };
          }
          return newMsgs;
        });

        setVerificationResult({
          decisionId: pendingDecision.packet.decision_id,
          txHash: hash,
          ipfsCid: confirmData.ipfs_cid
        });

        setPendingDecision(null);
      }
    } catch (e: any) {
      console.error(e);
      setVerificationSteps(prev => prev.map(s =>
        s.status === 'loading' ? { ...s, status: 'error', detail: e.message } : s
      ));
      showError({ message: "Verification Failed", detail: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text, null);
  };


  // --- Render ---

  return (
    <div className="flex flex-col h-screen w-full max-w-5xl mx-auto bg-transparent">
      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth relative scrollbar-hide hover:scrollbar-visible">



        {/* Control Panel */}
        {selectedModels && (
          <div className="sticky top-0 z-20 mb-6 animate-in fade-in slide-in-from-top-2">
            <ControlPanel
              currentDomain={domain}
              onDomainChange={setDomain}
              executionEnabled={executionEnabled}
              onExecutionToggle={setExecutionEnabled}
            />
          </div>
        )}

        <div className="flex flex-col space-y-4 pb-10">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {msg.type === 'bot' ? (
                  <div className="w-12 h-12 flex items-center justify-center -ml-2">
                    <Lottie animationData={chatRobot} loop={true} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-neutral-400">
                    <span className="text-xs font-bold">YOU</span>
                  </div>
                )}
              </div>

              {/* Content Bubble */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] space-y-2 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm
                          ${msg.type === 'user'
                    ? 'bg-neutral-800 text-[#FAF3E1] rounded-tr-none'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none'
                  }
                      `}>
                  {(msg.imageData || msg.fileName) && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-black/20 border border-white/5 rounded-xl w-fit group cursor-default">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center border border-neutral-700 shrink-0">
                        <FileText className="w-4 h-4 text-[#FA8112]" />
                      </div>
                      <div className="flex flex-col pr-2">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Attachment</span>
                        <span className="text-[11px] text-[#FAF3E1] font-medium leading-none mt-1 truncate max-w-[120px]">
                          {msg.fileName || 'Image File'}
                        </span>
                      </div>
                    </div>
                  )}

                  {msg.isTyping ? (
                    <div className="flex space-x-1.5 h-6 items-center">
                      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></div>
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        code: ({ children }) => <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono text-[#FA8112]">{children}</code>
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Bot specialized panels */}
                {msg.type === 'bot' && !msg.isTyping && (
                  <div className="w-full space-y-4 animate-in fade-in duration-700 delay-150">

                    {/* 1. MODEL REVIEW STEP (Blocking) */}
                    {msg.agentVotes && !msg.selectedVote && (
                      <ModelResultReviewPanel
                        results={msg.agentVotes}
                        onSelect={(name) => handleModelSelection(idx, name)}
                      />
                    )}

                    {/* 2. POST-SELECTION VIEW (Authoritative) */}
                    {msg.selectedVote && (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg animate-in fade-in">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-200">
                          Authoritative Model: <span className="font-bold text-white">{msg.selectedVote}</span>
                        </span>
                      </div>
                    )}

                    {/* 3. EXECUTION & LOGS (Only after selection OR if no votes) */}
                    {(!msg.agentVotes || msg.selectedVote) && (
                      <>
                        {/* Execution Strategy */}
                        {msg.strategySteps && msg.strategySteps.length > 0 && (
                          <>
                            {executionEnabled && domain === 'DeFi' ? (
                              <ExecutionStrategyPanel
                                steps={msg.strategySteps}
                                onExecute={(stepId) => {
                                  const step = msg.strategySteps?.find(s => s.id === stepId);
                                  if (step) executeStrategyStep(stepId, (step as any).txData);
                                }}
                                isExecuting={executingStepId !== null}
                              />
                            ) : (
                              <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg flex items-center justify-between text-xs text-neutral-500">
                                <span>Action identified, but execution is disabled in {domain} / Log-Only mode.</span>
                                <span className="font-mono px-2 py-0.5 bg-neutral-800 rounded text-neutral-400">LOGGED</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Agent Consensus (Show if no selection flow) */}
                        {msg.agentVotes && msg.selectedVote && (
                          <AgentDecisionPanel agents={msg.agentVotes} consensusScore={msg.consensusScore || "N/A"} />
                        )}

                        {/* Trust Proof */}
                        {msg.trustProof && (
                          <TrustProofPanel {...msg.trustProof} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Status Toast */}
          {status && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
              <div className={`
                px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border flex items-center gap-4 min-w-[320px] max-w-md
                ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-neutral-900/80 border-neutral-700'}
              `}>
                {status.type === 'loading' && <div className="w-5 h-5 border-2 border-[#FAF3E1] border-t-transparent rounded-full animate-spin"></div>}
                {status.type === 'success' && <CheckCircle className="w-5 h-5 text-[#FA8112]" />}
                {status.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}

                <div className="flex flex-col flex-1">
                  <span className={`text-sm font-semibold ${status.type === 'error' ? 'text-red-200' : 'text-[#FAF3E1]'}`}>
                    {status.message}
                  </span>
                  {status.subMessage && <span className="text-xs text-neutral-400 mt-0.5">{status.subMessage}</span>}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-neutral-900/10 backdrop-blur-sm border-t border-white/5 p-4">
        <ChatSuggestions
          isVisible={!isLoading}
          onSuggestionClick={handleSuggestionClick}
        />
        <ChatInput
          onSend={handleSend}
          onVerify={handleVerify}
          canVerify={!!pendingDecision}
          isLoading={isLoading}
          selectedModels={selectedModels}
          onModelChange={handleOpenModelSelector}
          onPreviewRequest={openFilePreview}
          placeholder={!selectedModels ? "Select AI models to start..." : undefined}
        />
      </div>

      {/* Verification Progress Modal */}
      <VerificationProgressModal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setVerificationSteps([]);
          setVerificationResult({});
        }}
        steps={verificationSteps}
        decisionId={verificationResult.decisionId}
        txHash={verificationResult.txHash}
        ipfsCid={verificationResult.ipfsCid}
      />
    </div>
  );
};

export default ChatInterface;
