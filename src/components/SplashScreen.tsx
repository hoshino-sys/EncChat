import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'bloom' | 'stamp' | 'fadeout'>('bloom');
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current?.();
  };

  useEffect(() => {
    // 1. Water-ink bloom -> Stamp drop
    const timer1 = setTimeout(() => {
      setPhase('stamp');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
    }, 350);

    // 2. Stamp drop -> Fadeout
    const timer2 = setTimeout(() => {
      setPhase('fadeout');
    }, 1050);

    // 3. Complete and unmount
    const timer3 = setTimeout(() => {
      handleFinish();
    }, 1300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0B0D] select-none cursor-pointer transition-opacity duration-300 ease-out ${
        phase === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ink Mist Diffusion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div
          className={`w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#4E7A6B]/15 via-[#141619]/90 to-transparent blur-3xl transition-all duration-1000 ease-out transform ${
            phase !== 'bloom' ? 'scale-150 opacity-100' : 'scale-75 opacity-40'
          }`}
        />
        {/* Subtle radial ink ripples */}
        <div className="absolute w-[280px] h-[280px] rounded-full border border-[rgba(230,228,221,0.04)] animate-ping opacity-25" />
      </div>

      {/* Center Seal Core */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Restrained Vermilion Square Seal */}
        <div
          className={`relative transition-all duration-500 ease-out transform ${
            phase === 'bloom'
              ? 'scale-110 opacity-0 -translate-y-3'
              : 'scale-100 opacity-100 translate-y-0'
          }`}
        >
          {/* Cinnabar Square Outer Seal Frame (Micro-rounded 6px) */}
          <div className="w-20 h-20 rounded-[6px] bg-[#9E2A2B] p-1 shadow-[0_4px_24px_rgba(158,42,43,0.35)] flex items-center justify-center border border-[rgba(184,59,43,0.6)]">
            {/* Inner Clean Seal Chamber */}
            <div className="w-full h-full rounded-[4px] border border-[rgba(230,228,221,0.2)] flex items-center justify-center bg-[#0A0B0D]/30 relative overflow-hidden">
              <span className="font-serif text-2xl font-normal text-[#E6E4DD] tracking-[0.2em] ml-1">
                墨隐
              </span>
            </div>
          </div>
        </div>

        {/* Clean Seal Subtitle */}
        <div
          className={`mt-6 text-center transition-all duration-700 delay-100 ease-out ${
            phase === 'bloom' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="font-serif text-sm tracking-[0.35em] text-[#E6E4DD]/85 font-light">
            墨 隐
          </div>
        </div>
      </div>
    </div>
  );
};
