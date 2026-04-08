import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CustomCursor: React.FC = () => {
    const dotRef = useRef<HTMLDivElement>(null);
    const followerRef = useRef<HTMLDivElement>(null);
    const isMobile = useRef(false);

    useEffect(() => {
        // Hide on touch devices
        isMobile.current =
            window.matchMedia('(pointer: coarse)').matches ||
            navigator.maxTouchPoints > 0;

        if (isMobile.current) return;

        const dot = dotRef.current;
        const follower = followerRef.current;
        if (!dot || !follower) return;

        const xTo = gsap.quickTo(dot, 'x', { duration: 0.15, ease: 'power2.out' });
        const yTo = gsap.quickTo(dot, 'y', { duration: 0.15, ease: 'power2.out' });
        const fxTo = gsap.quickTo(follower, 'x', { duration: 0.5, ease: 'power3.out' });
        const fyTo = gsap.quickTo(follower, 'y', { duration: 0.5, ease: 'power3.out' });

        const moveCursor = (e: MouseEvent) => {
            xTo(e.clientX);
            yTo(e.clientY);
            fxTo(e.clientX);
            fyTo(e.clientY);
        };

        const handleEnter = () => {
            gsap.to(follower, { scale: 2.5, duration: 0.3, ease: 'power2.out' });
            gsap.to(dot, { scale: 0, duration: 0.3 });
        };

        const handleLeave = () => {
            gsap.to(follower, { scale: 1, duration: 0.3, ease: 'power2.out' });
            gsap.to(dot, { scale: 1, duration: 0.3 });
        };

        const handleWindowLeave = () => {
            gsap.to([dot, follower], { opacity: 0, duration: 0.3, ease: 'power2.out' });
        };

        const handleWindowEnter = () => {
            gsap.to([dot, follower], { opacity: 1, duration: 0.3, ease: 'power2.out' });
        };

        window.addEventListener('mousemove', moveCursor);
        document.addEventListener('mouseleave', handleWindowLeave);
        document.addEventListener('mouseenter', handleWindowEnter);

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !target.closest) return;

            // Handle interactive scale up
            if (target.closest('a, button, [data-cursor-hover], input, textarea')) {
                gsap.to(follower, { scale: 2.5, duration: 0.3, ease: 'power2.out' });
                gsap.to(dot, { scale: 0, duration: 0.3 });
            }

            // Handle hiding over iframes or specific zones
            if (target.closest('[data-cursor-hide]')) {
                gsap.to([dot, follower], { opacity: 0, duration: 0.3, ease: 'power2.out' });
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !target.closest) return;

            // Revert interactive scale
            if (target.closest('a, button, [data-cursor-hover], input, textarea')) {
                gsap.to(follower, { scale: 1, duration: 0.3, ease: 'power2.out' });
                gsap.to(dot, { scale: 1, duration: 0.3 });
            }

            // Revert visibility
            if (target.closest('[data-cursor-hide]')) {
                gsap.to([dot, follower], { opacity: 1, duration: 0.3, ease: 'power2.out' });
            }
        };

        window.addEventListener('mousemove', moveCursor);
        document.addEventListener('mouseleave', handleWindowLeave);
        document.addEventListener('mouseenter', handleWindowEnter);
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            document.removeEventListener('mouseleave', handleWindowLeave);
            document.removeEventListener('mouseenter', handleWindowEnter);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, []);

    if (typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)) {
        return null;
    }

    return (
        <>
            {/* Dot (inner) */}
            <div
                ref={dotRef}
                className="fixed top-0 left-0 pointer-events-none z-[9999]"
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transform: 'translate(-50%, -50%)',
                    mixBlendMode: 'difference',
                }}
            />
            {/* Follower (outer ring) */}
            <div
                ref={followerRef}
                className="fixed top-0 left-0 pointer-events-none z-[9998]"
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.5)',
                    transform: 'translate(-50%, -50%)',
                    mixBlendMode: 'difference',
                }}
            />
        </>
    );
};

export default CustomCursor;
