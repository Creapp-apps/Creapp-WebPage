import { useRef, type ReactNode, type MouseEvent } from 'react';
import gsap from 'gsap';

interface MagneticButtonProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    strength?: number;
}

const MagneticButton: React.FC<MagneticButtonProps> = ({
    children,
    className = '',
    onClick,
    strength = 0.3,
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
        const btn = buttonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(btn, {
            x: x * strength,
            y: y * strength,
            duration: 0.4,
            ease: 'power2.out',
        });

        if (contentRef.current) {
            gsap.to(contentRef.current, {
                x: x * strength * 0.5,
                y: y * strength * 0.5,
                duration: 0.4,
                ease: 'power2.out',
            });
        }
    };

    const handleMouseLeave = () => {
        gsap.to(buttonRef.current, {
            x: 0,
            y: 0,
            duration: 0.7,
            ease: 'elastic.out(1, 0.3)',
        });
        if (contentRef.current) {
            gsap.to(contentRef.current, {
                x: 0,
                y: 0,
                duration: 0.7,
                ease: 'elastic.out(1, 0.3)',
            });
        }
    };

    return (
        <button
            ref={buttonRef}
            className={className}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            data-cursor-hover
        >
            <span ref={contentRef} className="inline-flex items-center gap-2">
                {children}
            </span>
        </button>
    );
};

export default MagneticButton;
