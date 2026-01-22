import { useGSAP } from '@gsap/react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lottie from 'lottie-react';
import { Activity, ArrowRight, Lock, Shield, Zap } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router';
import contentModerationAnimation from './assets/content-moderation.json';
import flintLogo from './assets/logo.svg';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const containerRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 1. Reveal Hero (Standard Entrance)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-content > *', { y: 30, opacity: 0, duration: 1, stagger: 0.1, delay: 0.2 })
      .from('.hero-visual', { scale: 0.9, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, "-=0.8");

    // 2. Story Section (Pinned Scroll Sequence)
    // We create ONE Master Timeline that is linked to the scroll position of the container.
    const storySections = gsap.utils.toArray<HTMLElement>('.story-section');

    // Initial States: First visible (static), others hidden/blurred (static)
    // We let the timeline modify these properties.
    gsap.set(storySections, { opacity: 0, zIndex: 0, scale: 0.8, filter: 'blur(10px)', pointerEvents: 'none' });
    gsap.set(storySections[0], { opacity: 1, zIndex: 10, scale: 1, filter: 'blur(0px)', pointerEvents: 'auto' });

    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: storyRef.current, // Pin the clean container
        start: 'top top',
        end: '+=2000', // Scroll distance to complete the story
        scrub: 0.5, // Slight smoothing
        pin: true,
        anticipatePin: 1
      }
    });

    // Animate between slides
    storySections.forEach((section, i) => {
      // Skip the last slide as it just stays visible or handles its own entrance
      if (i === storySections.length - 1) return;

      const nextSection = storySections[i + 1];

      scrollTl
        // Step 1: Fade OUT current
        .to(section, {
          opacity: 0,
          scale: 1.1, // Zoom out effect
          filter: 'blur(20px)',
          duration: 1,
          ease: 'power2.inOut'
        })
        // Step 2: Fade IN next (Overlap slightly for smoothness)
        .to(nextSection, {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          zIndex: 20 + i, // Ensure it sits on top
          pointerEvents: 'auto',
          duration: 1,
          ease: 'power2.inOut'
        }, "<0.2"); // Start 0.2 seconds after previous starts (heavier overlap for speed)
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="bg-neutral-950 text-[#FAF3E1] selection:bg-[#FA8112]/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FA8112]/10 rounded-full blur-[100px] opacity-30 animate-pulse delay-700"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F5E7C6]/10 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 px-6 py-6 flex items-center justify-between z-50 bg-gradient-to-b from-neutral-950/80 to-transparent backdrop-blur-sm">
        <a href="/">
          <div className="flex items-center gap-3">
            <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
          </div>
        </a>
        <div className="flex items-center gap-4">
          {/* ... existing nav actions ... */}
          <a
            href="https://x.com/flint_network"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm text-neutral-400 hover:text-[#FAF3E1] transition-colors py-2 px-4 rounded-lg hover:bg-neutral-900"
          >
            X / Twitter
          </a>
          <appkit-button />
        </div>
      </nav>

      {/* SPLIT HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-20 px-6 z-10 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-center w-full">
          {/* Left: Text Content */}
          <div className="hero-content flex flex-col items-start gap-8 text-left max-w-2xl">


            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1] bg-clip-text text-transparent bg-gradient-to-br from-[#FAF3E1] via-white to-neutral-400">
              Trust only <br />
              what you decide<br />
              <span className="text-[#FA8112]">to verify.</span>
            </h1>

            <p className="text-xl text-neutral-400 max-w-lg leading-relaxed">
              The first execution layer that doesn't just run agents it forces them to prove their work on-chain before money moves.
            </p>


          </div>

          {/* Right: Visual (Lottie) */}
          <div className="hero-visual relative flex items-center justify-center h-full min-h-[500px]">
            {/* Visual decoration behind */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FA8112]/5 to-transparent rounded-full blur-3xl transform scale-75"></div>
            <div className="relative w-full max-w-[1000px] z-10 transform scale-125 origin-center">
              <Lottie animationData={contentModerationAnimation} loop={true} />
            </div>
          </div>
        </div>
      </section>

      {/* NEW ACTION STRIP SECTION */}
      <div className="w-full flex border-y border-neutral-800 bg-neutral-950/50 backdrop-blur-sm z-30 relative overflow-hidden group">
        {/* Button 1: Start / Connect */}
        <button
          onClick={() => isConnected ? navigate('/chat') : open({ view: 'Connect' })}
          className="flex-1 h-24 flex items-center justify-center border-r border-neutral-800 hover:bg-[#FA8112]/5 transition-all duration-500 relative overflow-hidden group/btn1"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <span className="text-2xl md:text-3xl font-black tracking-widest uppercase text-[#FAF3E1] group-hover/btn1:text-[#FA8112] transition-colors flex items-center gap-4">
            {isConnected ? 'Wanna try?' : 'Wallet Pls'}
            <ArrowRight className="w-6 h-6 transform -rotate-45 group-hover/btn1:rotate-0 transition-transform duration-500" />
          </span>
          {/* Animated border bottom for flare */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FA8112] transform scale-x-0 group-hover/btn1:scale-x-100 transition-transform duration-500 origin-left"></div>
        </button>

        {/* Button 2: System Check */}
        <button
          onClick={() => navigate('/trust')}
          className="flex-1 h-24 flex items-center justify-center hover:bg-neutral-900/50 transition-all duration-500 relative overflow-hidden group/btn2"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <span className="text-2xl md:text-3xl font-black tracking-widest uppercase text-neutral-500 group-hover/btn2:text-[#FAF3E1] transition-colors flex items-center gap-4">
            see it yourself
            <ArrowRight className="w-6 h-6 transform -rotate-45 group-hover/btn1:rotate-0 transition-transform duration-500" />
          </span>
          {/* Animated border bottom for flare */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white transform scale-x-0 group-hover/btn2:scale-x-100 transition-transform duration-500 origin-right"></div>
        </button>
      </div>

      {/* STORY SECTION (Pinned Scroll) */}
      <div ref={storyRef} className="relative h-screen bg-neutral-900 z-20">
        {/* Center Content Stack */}
        <div className="absolute inset-0 flex items-center justify-center px-6">

          {/* Story 1 */}
          <div className="story-section absolute w-full max-w-4xl text-center flex flex-col items-center gap-8">

            <h2 className="text-5xl md:text-7xl font-bold text-[#FAF3E1]">Consensus by Debate</h2>
            <p className="text-2xl text-neutral-400 max-w-2xl leading-relaxed">
              One AI is a guess. Three is a council. Our Conservative, Aggressive, and Neutral agents argue every trade only the winner executes.
            </p>
          </div>

          {/* Story 2 */}
          <div className="story-section absolute w-full max-w-4xl text-center flex flex-col items-center gap-8 opacity-0">

            <h2 className="text-5xl md:text-7xl font-bold text-white">Cryptographic Memory</h2>
            <p className="text-2xl text-neutral-400 max-w-2xl leading-relaxed">
              We don't just "log" chat. We hash the decision logic and pin it to the Flare Data Connector. History is immutable.
            </p>
          </div>

          {/* Story 3 */}
          <div className="story-section absolute w-full max-w-4xl text-center flex flex-col items-center gap-8 opacity-0">

            <h2 className="text-5xl md:text-7xl font-bold text-white">Don't Trust. Verify.</h2>
            <p className="text-2xl text-neutral-400 max-w-2xl leading-relaxed">
              Check the proofs yourself. Use the Trust Center to validate that the AI you're talking to is the one that signed the transaction.
            </p>
          </div>

        </div>

        {/* Scroll Indicators / Progress could go here */}
      </div>

      {/* Footer Spacer to allow partial scroll out */}

      <div className="h-[15vh] bg-neutral-900 z-20 relative flex items-end justify-center pb-20 ">
        <a href="https://x.com/KunalDhongade">
          <p className="text-neutral-600 font-mono cursor-pointer text-sm">FLINT NETWORK © 2026 | Kunal Dhongade</p>
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
