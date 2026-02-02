import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/creapp-logo.png';

interface SplashScreenProps {
    onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    useEffect(() => {
        // Total duration reduced to ~3s as requested
        const timer = setTimeout(() => {
            onComplete();
        }, 3200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
        >
            <div className="relative z-10 flex flex-col items-center">
                {/* Text Animation */}
                <motion.h1
                    className="font-display text-4xl md:text-6xl font-bold text-white mb-12 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span className="inline-block mr-2">Bienvenido/a a</span>
                    <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        CreAPP
                    </span>
                </motion.h1>

                {/* Rocket Construction/Launch */}
                <div className="relative w-24 h-24 mt-8">
                    {/* Rocket Icon replaced by Logo */}
                    <motion.div
                        initial={{ y: 200, opacity: 0, scale: 0.5 }}
                        animate={{
                            // Keyframes aligned: Enter -> Idle/Ignition -> Launch
                            y: [200, 0, 0, 0, 0, 0, 0, -1000],
                            x: [0, 0, -2, 2, -2, 2, 0, 0],
                            opacity: [0, 1, 1, 1, 1, 1, 1, 1],
                            scale: [0.5, 1, 1, 1.05, 1.05, 1.05, 1.1, 1.5]
                        }}
                        transition={{
                            duration: 2.2,
                            times: [0, 0.15, 0.4, 0.45, 0.5, 0.55, 0.8, 1],
                            ease: "easeInOut",
                            delay: 0.2
                        }}
                        className="relative z-10"
                    >
                        <img src={logo} alt="CreAPP Rocket" className="w-24 h-24 object-contain" />

                        {/* Engine Flame - Enhanced Visuals */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0, height: 0 }}
                            animate={{
                                scale: [0, 0.5, 0.4, 0.8, 0.6, 2],
                                opacity: [0, 0.6, 0.4, 0.8, 0.6, 0],
                                height: [0, 60, 50, 80, 70, 200]
                            }}
                            transition={{
                                delay: 0.5,
                                duration: 1.8,
                                times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                            }}
                            className="absolute top-[80%] left-1/2 -translate-x-1/2 w-16 bg-orange-500 blur-md rounded-b-full origin-top"
                        />
                        {/* Inner Core Flame (Hotter) */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 0.4, 0.3, 0.6, 1.5],
                                opacity: [0, 0.8, 0.6, 1, 0]
                            }}
                            transition={{
                                delay: 0.5,
                                duration: 1.8,
                                times: [0, 0.2, 0.4, 0.6, 1]
                            }}
                            className="absolute top-[80%] left-1/2 -translate-x-1/2 w-8 h-20 bg-yellow-200 blur-sm rounded-b-full origin-top"
                        />
                    </motion.div>
                </div>
            </div>

            {/* Starfield Background for depth */}
            <div className="absolute inset-0 z-0">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full opacity-0"
                        style={{
                            width: Math.random() * 3 + 1,
                            height: Math.random() * 3 + 1,
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0, 0.5, 0], scale: [0, 1, 0] }}
                        transition={{
                            duration: Math.random() * 2 + 1,
                            repeat: Infinity,
                            delay: Math.random() * 2
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
};
