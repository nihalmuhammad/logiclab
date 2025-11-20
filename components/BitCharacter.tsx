import React, { useEffect, useState, useRef } from 'react';

interface BitCharacterProps {
  message: string;
  emotion: 'happy' | 'thinking' | 'idle' | 'celebrate';
  loading?: boolean;
  onAskHint: () => void;
}

export const BitCharacter: React.FC<BitCharacterProps> = ({ message, emotion, loading, onAskHint }) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  // Use a ref to track the current message being typed to avoid race conditions
  const currentMessageRef = useRef(message);

  useEffect(() => {
    currentMessageRef.current = message;
    setDisplayedMessage('');
    
    // Safety check
    if (!message || typeof message !== 'string') return;

    let charIndex = 0;
    const typingSpeed = 30; // ms per char

    const timer = setInterval(() => {
      // Ensure we are only typing if the index is within bounds
      if (charIndex < message.length) {
        charIndex++;
        // Using slice is safer than appending character by character
        // because it relies on the original full string, preventing skipped letters
        setDisplayedMessage(message.slice(0, charIndex));
      } else {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [message]);

  return (
    <div className="fixed bottom-6 right-6 md:right-12 flex flex-col items-end z-50 pointer-events-none">
      {/* Chat Bubble */}
      <div className="bg-white text-slate-800 p-6 rounded-3xl rounded-br-none shadow-xl mb-4 max-w-xs border-4 border-toy-blue relative pointer-events-auto transition-all duration-300 transform hover:scale-105">
        {/* Text Container with min-height to prevent jumping */}
        <div className="min-h-[3rem] flex items-center">
            <p className="font-sans text-lg font-bold leading-snug text-toy-panel break-words whitespace-normal">
            {loading ? "Thinking..." : displayedMessage}
            </p>
        </div>
        {!loading && displayedMessage.length === message.length && (
          <button 
            onClick={onAskHint}
            className="mt-3 text-sm bg-toy-blue text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-400 transition-colors shadow-md w-full animate-fade-in"
          >
            Need a Hint? 🤖
          </button>
        )}
      </div>

      {/* Bit The Robot Visual */}
      <div className={`relative w-28 h-28 transition-transform duration-500 ${emotion === 'celebrate' ? 'animate-bounce' : ''}`}>
        {/* Antenna */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-6 bg-slate-400 rounded-full"></div>
        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg ${loading ? 'bg-red-500 animate-ping' : 'bg-toy-yellow'}`}></div>
        
        {/* Head */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-20 bg-slate-700 rounded-2xl border-4 border-slate-500 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
           {/* Screen Face */}
           <div className="w-20 h-12 bg-black rounded-xl flex items-center justify-center space-x-3 border-2 border-slate-600 shadow-inner">
              <div className={`h-3 w-3 bg-toy-blue rounded-full ${emotion === 'thinking' ? 'animate-pulse' : ''} shadow-[0_0_10px_#38bdf8]`}></div>
              <div className={`h-3 w-3 bg-toy-blue rounded-full ${emotion === 'thinking' ? 'animate-pulse delay-75' : ''} shadow-[0_0_10px_#38bdf8]`}></div>
           </div>
           {/* Mouth */}
           {emotion === 'happy' && <div className="w-6 h-2 bg-white mt-2 rounded-full"></div>}
           {emotion === 'celebrate' && <div className="w-8 h-3 border-b-4 border-white rounded-full mt-0"></div>}
           {emotion === 'idle' && <div className="w-4 h-1 bg-white mt-2 rounded-full opacity-50"></div>}
        </div>
        
        {/* Body Hint */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-slate-600 rounded-t-2xl"></div>
      </div>
    </div>
  );
};