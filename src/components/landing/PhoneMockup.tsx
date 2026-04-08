import React, { useState } from 'react';

interface PhoneMockupProps {
    url: string;
    appName?: string;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({ url, appName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isInView, setIsInView] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 } // Trigger when 10% visible
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Reset view state if URL changes so it reloads fresh if needed
    React.useEffect(() => {
        setIsLoading(true);
    }, [url]);

    return (
        <div ref={containerRef} className="relative mx-auto" style={{ width: 320, height: 660 }} data-cursor-hide>
            {/* Phone frame */}
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_0_80px_rgba(0,240,255,0.12),0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden">
                {/* Top notch / Dynamic Island */}
                <div className="relative z-20 flex justify-center pt-3">
                    <div className="w-[120px] h-[32px] bg-black rounded-full border border-white/5" />
                </div>

                {/* Screen area */}
                <div className="absolute top-0 left-[6px] right-[6px] bottom-0 top-[0px] rounded-[2.7rem] overflow-hidden bg-[#050505]">
                    {/* Loading skeleton */}
                    {(!isInView || isLoading) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a] z-10 transition-opacity duration-500">
                            <div className="w-10 h-10 border-2 border-cyan-electric/30 border-t-cyan-electric rounded-full animate-spin" />
                            <span className="text-xs text-slate-500 tracking-wider uppercase">
                                {!isInView ? 'Esperando scroll...' : `Cargando ${appName || 'app'}...`}
                            </span>
                        </div>
                    )}

                    {/* Iframe - Only loads when scrolled into view perfectly preventing autofocus jumps */}
                    {isInView && (
                        <iframe
                            src={url}
                            title={appName || 'App Preview'}
                            className={`w-full h-full border-0 transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                borderRadius: '2.7rem',
                                transform: 'scale(0.99)',
                                transformOrigin: 'top center',
                            }}
                            onLoad={() => setIsLoading(false)}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                    )}
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[140px] h-[5px] bg-white/20 rounded-full z-20" />
            </div>

            {/* Side buttons */}
            <div className="absolute -left-[2px] top-[120px] w-[3px] h-[30px] bg-[#1a1a1a] rounded-l-sm" />
            <div className="absolute -left-[2px] top-[170px] w-[3px] h-[50px] bg-[#1a1a1a] rounded-l-sm" />
            <div className="absolute -left-[2px] top-[230px] w-[3px] h-[50px] bg-[#1a1a1a] rounded-l-sm" />
            <div className="absolute -right-[2px] top-[160px] w-[3px] h-[70px] bg-[#1a1a1a] rounded-r-sm" />
        </div>
    );
};

export default PhoneMockup;
