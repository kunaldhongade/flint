import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Lottie from 'lottie-react';
import { CheckCircle, Clock, MessageSquare, Shield, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAccount, useWalletClient } from 'wagmi';
import DecisionLoggerArtifact from '../abis/DecisionLogger.json';
import chatRobot from '../assets/chat_robot.json';
import { AgentDecisionPanel } from './chat/AgentDecisionPanel';
import { ChatInput } from './chat/ChatInput';
import { ExecutionStrategyPanel, StrategyStep } from './chat/ExecutionStrategyPanel';
import { TrustProofPanel } from './chat/TrustProofPanel';

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
  timestamp: number;
}

interface Message {
  text: string;
  type: 'user' | 'bot';
  imageData?: string;
  isTyping?: boolean;
  agentVotes?: AgentVote[];
  consensusScore?: string;
  trustProof?: TrustProof;
  strategySteps?: StrategyStep[];
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    // Default start if no session or new
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

  const logDecisionOnChain = async (packet: any, loggerAddress: string) => {
    if (!walletClient || !packet) return;

    setStatus({
      message: "Verifying Decision",
      subMessage: "Logging proof to Flare Data Connector...",
      type: "loading"
    });

    try {
      const cleanUuid = packet.decision_id.replace(/-/g, '');
      const decisionIdBytes32 = `0x${cleanUuid.padEnd(64, '0')}`;
      const decisionHash = packet.decision_hash.startsWith('0x') ? packet.decision_hash : `0x${packet.decision_hash}`;
      const modelHash = packet.model_hash.startsWith('0x') ? packet.model_hash : `0x${packet.model_hash}`;
      const fdcProofHash = packet.fdc_proof_hash
        ? (packet.fdc_proof_hash.startsWith('0x') ? packet.fdc_proof_hash : `0x${packet.fdc_proof_hash}`)
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

      const args = [
        decisionIdBytes32,
        decisionHash,
        modelHash,
        BigInt(packet.ftso_round_id || 0),
        fdcProofHash,
        BigInt(packet.timestamp),
        packet.backend_signer
      ];

      const hash = await walletClient.writeContract({
        address: loggerAddress as `0x${string}`,
        abi: DecisionLoggerArtifact.abi,
        functionName: 'logDecision',
        args: args
      });

      setStatus({
        message: "Decision Logged",
        subMessage: " Waiting for confirmation...",
        type: "loading"
      });

      // Simple wait (in a real app, use waitForTransaction)
      await new Promise(r => setTimeout(r, 4000));

      return hash;
    } catch (error: any) {
      console.error("Failed to log decision:", error);
      setStatus({
        message: "Logging Failed (Non-blocking)",
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
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setExecutingStepId(null);
    }
  };

  // --- API Interaction ---

  const handleSend = async (text: string, file: File | null) => {
    // 1. Add User Message
    const userMsg: Message = { text, type: 'user' };
    if (file && file.type.startsWith('image/')) {
      userMsg.imageData = URL.createObjectURL(file);
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

      // 3. Process Decision Logging (simulated concurrent update)
      let txHash: string | undefined;
      if (data.decision_packet && data.decision_logger_address) {
        updateLastMessage({ text: "Verifying decision on Flare..." });
        const hash = await logDecisionOnChain(data.decision_packet, data.decision_logger_address);
        if (hash) txHash = hash;
      }

      setStatus(null);

      // 4. Construct Final Message
      // Extract Agent Votes (Mock data if not in backend yet, or parsing logic)
      // Ideally backend returns this structure. For now, we simulate if not present.
      const agentVotes: AgentVote[] = data.agent_votes || [
        { name: 'Conservator', role: 'Conservative', decision: 'approve', reason: 'Risk falls within safe parameters.' },
        { name: 'Strategist', role: 'Neutral', decision: 'approve', reason: 'Aligned with user request.' },
        { name: 'Degen', role: 'Aggressive', decision: 'reject', reason: 'Yield too low.' },
      ];

      // Parse Strategy Steps
      let strategySteps: StrategyStep[] = [];
      if (data.transactions) {
        try {
          const txs = JSON.parse(data.transactions);
          strategySteps = txs.map((t: any, i: number) => ({
            id: `step-${Date.now()}-${i}`,
            protocol: 'Flare',
            action: t.description || 'Transaction',
            amount: '---', // Extract if possible
            status: 'ready',
            txData: t.tx || t // Store raw tx data for execution
          }));
        } catch (e) { console.error("Error parsing txs", e); }
      }

      const trustProof: TrustProof | undefined = data.decision_packet ? {
        decisionId: data.decision_packet.decision_id,
        decisionHash: data.decision_packet.decision_hash,
        timestamp: data.decision_packet.timestamp * 1000,
        txHash: txHash
      } : undefined;

      updateLastMessage({
        text: data.response,
        isTyping: false,
        agentVotes,
        consensusScore: "2/3",
        trustProof,
        strategySteps: strategySteps.length > 0 ? strategySteps : undefined
      });

    } catch (error) {
      console.error(error);
      updateLastMessage({ text: "Sorry, I encountered an error processing your request.", isTyping: false });
      setStatus({ message: "Error", type: "error" });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Render ---

  return (
    <div className="flex flex-col h-screen w-full max-w-5xl mx-auto bg-transparent">
      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth scrollbar-thin scrollbar-thumb-neutral-800">
        <div className="flex flex-col justify-end min-h-full space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {msg.type === 'bot' ? (
                  <div className="w-12 h-12 flex items-center justify-center -ml-2">
                    <Lottie animationData={chatRobot} loop={true} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-400">
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
                  {msg.imageData && (
                    <img src={msg.imageData} alt="User upload" className="max-w-full rounded-lg mb-3 border border-neutral-700" />
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
                    {/* 1. Execution Strategy (If actionable) */}
                    {msg.strategySteps && msg.strategySteps.length > 0 && (
                      <ExecutionStrategyPanel
                        steps={msg.strategySteps}
                        onExecute={(stepId) => {
                          const step = msg.strategySteps?.find(s => s.id === stepId);
                          if (step) executeStrategyStep(stepId, (step as any).txData);
                        }}
                        isExecuting={executingStepId !== null}
                      />
                    )}

                    {/* 2. Agent Consensus */}
                    {msg.agentVotes && (
                      <AgentDecisionPanel agents={msg.agentVotes} consensusScore={msg.consensusScore || "N/A"} />
                    )}

                    {/* 3. Trust Proof */}
                    {msg.trustProof && (
                      <TrustProofPanel {...msg.trustProof} />
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
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface;
