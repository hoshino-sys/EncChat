import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'bloom' | 'stamp' | 'fadeout'>('bloom');

  useEffect(() => {
    // 1. Water-ink bloom -> Stamp drop
    const timer1 = setTimeout(() => {
      setPhase('stamp');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
    }, 380);

    // 2. Stamp drop -> Fadeout
    const timer2 = setTimeout(() => {
      setPhase('fadeout');
    }, 1200);

    // 3. Complete and unmount
    const timer3 = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080a] select-none cursor-pointer transition-opacity duration-300 ease-out ${
        phase === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ink Mist Diffusion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div
          className={`w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#1b0d10]/60 via-[#10121a]/80 to-transparent blur-3xl transition-all duration-1000 ease-out transform ${
            phase !== 'bloom' ? 'scale-150 opacity-100' : 'scale-75 opacity-40'
          }`}
        />
        {/* Subtle radial ink ripples */}
        <div className="absolute w-[280px] h-[280px] rounded-full border border-[#a83232]/10 animate-ping opacity-30" />
      </div>

      {/* Center Seal Core */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Ancient Vermilion Seal Stamp */}
        <div
          className={`relative transition-all duration-500 ease-out transform ${
            phase === 'bloom'
              ? 'scale-125 opacity-0 -translate-y-4'
              : 'scale-100 opacity-100 translate-y-0'
          }`}
        >
          {/* Cinnabar Outer Seal Frame */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#a83232] via-[#8c2222] to-[#591010] p-1 shadow-[0_0_36px_rgba(168,50,50,0.5),inset_0_0_12px_rgba(0,0,0,0.6)] flex items-center justify-center border-2 border-[#e5c158]/40">
            {/* Inner Antique Texture */}
            <div className="w-full h-full rounded-xl border border-[#e5c158]/30 flex items-center justify-center bg-[#090b0e]/30 relative overflow-hidden">
              <span className="font-serif text-3xl font-black text-[#f5ebd5] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                墨隐
              </span>
              {/* Corner Ornaments */}
              <div className="absolute top-1 left-1 text-[8px] text-[#e5c158]/60 font-mono">⌜</div>
              <div className="absolute top-1 right-1 text-[8px] text-[#e5c158]/60 font-mono">⌝</div>
              <div className="absolute bottom-1 left-1 text-[8px] text-[#e5c158]/60 font-mono">⌞</div>
              <div className="absolute bottom-1 right-1 text-[8px] text-[#e5c158]/60 font-mono">⌟</div>
            </div>
          </div>

          {/* Golden stamp shadow rim */}
          <div className="absolute -inset-1 rounded-2xl border border-[#e5c158]/20 blur-[2px] pointer-events-none" />
        </div>

        {/* Title & Motto */}
        <div
          className={`mt-6 text-center transition-all duration-700 delay-100 ease-out ${
            phase === 'bloom' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="font-serif text-lg font-bold tracking-[0.3em] text-stone-200 drop-shadow-md">
            墨 隐
          </div>
          <div className="mt-2 text-xs font-serif tracking-[0.25em] text-stone-500 font-light">
            密道封缄 · 绝密私语
          </div>
        </div>
      </div>

      {/* Skip Hint */}
      <div className="absolute bottom-8 text-[11px] font-serif text-stone-600 tracking-wider">
        轻触任意处即可跳过
      </div>
    </div>
  );
};
