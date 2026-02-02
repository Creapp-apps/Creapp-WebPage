import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Database, Cpu, Terminal, Braces, Binary, Globe, Command, Hash, Zap, Layout, Shield } from 'lucide-react';

const icons = [
    // Top (Moved down significantly)
    { Icon: Code2, color: 'text-blue-500', size: 60, initialX: 0, initialY: -180, delay: 0 },
    // Top Right (Moved down and right)
    { Icon: Database, color: 'text-purple-500', size: 50, initialX: 220, initialY: -100, delay: 1.5 },
    // Right
    { Icon: Cpu, color: 'text-green-500', size: 44, initialX: 240, initialY: 0, delay: 0.5 },
    // Bottom Right
    { Icon: Terminal, color: 'text-yellow-500', size: 54, initialX: 200, initialY: 260, delay: 2 },
    // Bottom
    { Icon: Braces, color: 'text-pink-500', size: 38, initialX: 0, initialY: 360, delay: 1 },
    // Bottom Left
    { Icon: Binary, color: 'text-cyan-500', size: 48, initialX: -200, initialY: 260, delay: 2.5 },
    // Left
    { Icon: Globe, color: 'text-indigo-500', size: 50, initialX: -240, initialY: 0, delay: 0.8 },
    // Top Left (Moved down)
    { Icon: Command, color: 'text-rose-500', size: 42, initialX: -190, initialY: -140, delay: 1.8 },

    // Closer Inner Circle
    { Icon: Hash, color: 'text-teal-500', size: 36, initialX: 140, initialY: -120, delay: 3 },
    { Icon: Zap, color: 'text-amber-500', size: 40, initialX: -140, initialY: 120, delay: 1.2 },
    { Icon: Layout, color: 'text-violet-500', size: 44, initialX: 140, initialY: 120, delay: 2.2 },
    { Icon: Shield, color: 'text-emerald-500', size: 42, initialX: -140, initialY: -80, delay: 0.3 }
];

const codeSnippets = [
    { text: "const app = new App();", color: "text-slate-500", initialX: -220, initialY: -80, delay: 0.2 },
    { text: "<div>Hello World</div>", color: "text-slate-500", initialX: 220, initialY: 80, delay: 1.2 },
    { text: "npm install", color: "text-slate-500", initialX: -180, initialY: 180, delay: 0.7 },
    { text: "git push origin", color: "text-slate-500", initialX: 180, initialY: -180, delay: 2.2 },
    { text: "await fetch('/api')", color: "text-slate-500", initialX: 0, initialY: 390, delay: 1.6 },
    { text: "if (isLoading) return <Spinner />", color: "text-slate-500", initialX: 0, initialY: -390, delay: 2.5 },
    { text: "export default function", color: "text-slate-500", initialX: 230, initialY: -80, delay: 1.0 },
];

export const CodeBackground: React.FC = () => {
    return (
        <div
            className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-visible"
            style={{
                // Mask fades out the top 20% of the container to transparent
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
            }}
        >
            {/* Animated Icons */}
            {icons.map((item, index) => (
                <motion.div
                    key={index}
                    className={`absolute ${item.color} filter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]`}
                    initial={{ x: item.initialX * 0.8, y: item.initialY * 0.8, scale: 0, opacity: 0 }}
                    animate={{
                        x: [item.initialX, item.initialX + (Math.random() * 15 - 7.5)],
                        y: [item.initialY, item.initialY + (Math.random() * 15 - 7.5)],
                        rotate: [0, 8, -8, 0],
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: item.delay
                    }}
                >
                    <item.Icon size={item.size} />
                </motion.div>
            ))}

            {/* Floating Code Snippets */}
            {codeSnippets.map((item, index) => (
                <motion.div
                    key={`text-${index}`}
                    className={`absolute ${item.color} font-mono text-xs md:text-sm font-bold opacity-30 whitespace-nowrap blur-[0.5px]`}
                    initial={{ x: item.initialX * 0.8, y: item.initialY * 0.8, opacity: 0 }}
                    animate={{
                        x: [item.initialX, item.initialX + 8],
                        y: [item.initialY, item.initialY + 8],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 4 + Math.random() * 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: item.delay
                    }}
                >
                    {item.text}
                </motion.div>
            ))}
        </div>
    );
};
