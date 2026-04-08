import React, { useState, useRef, useEffect } from 'react';

interface DesktopMockupProps {
    url: string;
    appName?: string;
}

const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 900;

const DesktopMockup: React.FC<DesktopMockupProps> = ({ url, appName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isInView, setIsInView] = useState(false);
    const [scale, setScale] = useState(0.5);
    const containerRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);

    // Lazy-load via IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Dynamically calculate scale based on rendered screen width
    useEffect(() => {
        if (!screenRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            setScale(w / DESKTOP_WIDTH);
        });
        ro.observe(screenRef.current);
        return () => ro.disconnect();
    }, []);

    // Reset loading state when URL changes
    useEffect(() => {
        setIsLoading(true);
    }, [url]);

    return (
        <div ref={containerRef} className="relative w-full max-w-[800px] aspect-[16/10] mx-auto" data-cursor-hide>
            {/* Browser Window Frame */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_20px_80px_rgba(0,0,0,0.8),0_0_80px_rgba(0,240,255,0.05)] border border-white/10 overflow-hidden flex flex-col">

                {/* macOS-style Title Bar */}
                <div className="h-10 w-full bg-white/5 border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
                    {/* Traffic lights */}
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                    </div>
                    {/* URL Bar */}
                    <div className="flex-1 mx-4">
                        <div className="w-full max-w-sm mx-auto h-6 bg-black/40 rounded-full border border-white/5 flex items-center px-3 overflow-hidden">
                            <span className="text-[10px] text-slate-500 font-mono truncate">{url}</span>
                        </div>
                    </div>
                </div>

                {/* Screen Area */}
                <div ref={screenRef} className="relative flex-1 w-full bg-[#050505]">
                    {/* Loading skeleton */}
                    {(!isInView || isLoading) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a] z-10 transition-opacity duration-500">
                            <div className="w-10 h-10 border-2 border-cyan-electric/30 border-t-cyan-electric rounded-full animate-spin" />
                            <span className="text-xs text-slate-500 tracking-wider uppercase">
                                {!isInView ? 'Esperando scroll...' : `Cargando ${appName || 'sitio'}...`}
                            </span>
                        </div>
                    )}

                    {/* Iframe — renders at 1440×900 desktop resolution and scales down */}
                    {isInView && (
                        <iframe
                            src={url}
                            title={appName || 'Site Preview'}
                            className={`absolute top-0 left-0 border-0 transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                width: `${DESKTOP_WIDTH}px`,
                                height: `${DESKTOP_HEIGHT}px`,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                            }}
                            onLoad={() => setIsLoading(false)}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DesktopMockup;
