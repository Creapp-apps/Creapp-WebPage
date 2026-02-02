import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, CreditCard, Activity, ArrowUpRight, ArrowDownLeft, Wallet, Shield, ChevronLeft } from 'lucide-react';
import logo from '../../assets/creapp-logo.png';

interface PhoneMockupProps {
    appUrl?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ appUrl }) => {
    // State for internal navigation
    const [view, setView] = useState<'splash' | 'list' | 'app'>('splash');
    const [selectedApp, setSelectedApp] = useState<string | null>(null);

    const handleBack = () => {
        if (view === 'app') setView('list');
        if (view === 'list') setView('splash');
    };

    // Mock App Catalog
    const APPS = [
        {
            id: 'growapp',
            name: 'GrowAPP',
            desc: 'Gestión de Cultivos',
            url: 'https://crop-crm.vercel.app/login',
            icon: '🌱',
            color: 'bg-green-500'
        },
        {
            id: 'fintech',
            name: 'NeoBank',
            desc: 'Billetera Virtual',
            // Using a placeholder or the simulated view could be an option, 
            // but for now let's just use the same URL or alerts for demo purposes if no URL exists.
            url: 'https://demo.vercel.app',
            icon: '💳',
            color: 'bg-purple-500'
        }
    ];

    // If a prop URL is passed, we might want to override behavior, but for this "Showroom" feature,
    // we'll stick to the internal flow unless specifically handling the single-app case.
    // For now, ignoring initialAppUrl to prioritize the Showroom flow user asked for.

    return (
        <motion.div
            // Idle animation: Gentle oscillation
            animate={{
                rotateY: [0, -5, 0, 5, 0],
                rotateX: [0, 2, 0, -2, 0],
                y: [0, -15, 0]
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            // Hover: Snap to interactive state
            whileHover={{
                rotateY: 0,
                rotateX: 0,
                y: 0,
                scale: 1.02,
                transition: { duration: 0.3, ease: "easeOut" }
            }}
            className="relative w-[300px] h-[630px] bg-black rounded-[3rem] shadow-2xl overflow-hidden z-10 border-[6px] border-[#333] ring-1 ring-[#000]"
            style={{
                boxShadow: "0 0 0 2px #1a1a1a, 0 0 0 5px #2a2a2a, 0 20px 50px -10px rgba(0,0,0,0.5)"
            }}
        >
            {/* Glossy Reflection Overlay */}
            <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent rounded-[2.8rem]"></div>

            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-b-[16px] z-50 pointer-events-none flex justify-center items-start pt-1.5">
                <div className="w-16 h-4 bg-[#111] rounded-full flex items-center justify-end px-2 gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]"></div>
                </div>
            </div>

            {/* Screen Container */}
            <div className="w-full h-full bg-slate-950 overflow-hidden flex flex-col font-sans relative">

                {/* Status Bar (Visual Only) + Navigation */}
                <div className={`w-full h-12 bg-transparent flex justify-between items-center px-6 pt-3 select-none absolute top-0 left-0 z-30 pointer-events-none text-white ${view === 'app' ? 'mix-blend-difference' : ''}`}>

                    {/* Left Side: Time or Back Button */}
                    <div className="flex items-center gap-1 pointer-events-auto">
                        {view !== 'splash' ? (
                            <button
                                onClick={handleBack}
                                className="flex items-center justify-center w-8 h-8 -ml-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors backdrop-blur-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        ) : (
                            <span className="text-[10px] font-bold ml-2">9:41</span>
                        )}
                    </div>

                    <div className="flex gap-1.5 mr-2">
                        <div className="w-3 h-2.5 bg-white rounded-[2px]" />
                        <div className="w-3 h-2.5 bg-white rounded-[2px]" />
                        <div className="w-4 h-2.5 border border-white rounded-[2px] relative"><div className="absolute inset-0.5 bg-white" /></div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full h-full relative bg-black">

                    {/* 1. SPLASH SCREEN */}
                    {view === 'splash' && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                            <motion.img
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                src={logo}
                                alt="CreAPP Logo"
                                className="w-24 h-24 mb-6 object-contain"
                            />
                            <motion.h3 className="text-2xl font-bold mb-2 font-display">
                                CreAPP Showroom
                            </motion.h3>
                            <motion.p className="text-slate-400 text-sm mb-12 max-w-[200px]">
                                Explorá nuestro catálogo de soluciones en tiempo real.
                            </motion.p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setView('list')}
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-primary/25 transition-all"
                            >
                                <Play size={18} fill="currentColor" />
                                Ver Apps
                            </motion.button>
                        </div>
                    )}

                    {/* 2. APP LIST */}
                    {view === 'list' && (
                        <div className="absolute inset-0 z-20 flex flex-col p-6 pt-24 bg-slate-900 animate-in slide-in-from-right duration-300">
                            <h3 className="text-xl font-bold text-white mb-6">Nuestras Apps</h3>
                            <div className="flex flex-col gap-4">
                                {APPS.map((app) => (
                                    <button
                                        key={app.id}
                                        onClick={() => {
                                            if (app.url) {
                                                setSelectedApp(app.url);
                                                setView('app');
                                            }
                                        }}
                                        className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center gap-4 transition-colors group text-left w-full border border-white/5 hover:border-white/10"
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                                            {app.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{app.name}</h4>
                                            <p className="text-xs text-slate-400">{app.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setView('splash')}
                                className="mt-auto mx-auto text-sm text-slate-500 py-6 hover:text-white transition-colors"
                            >
                                Volver al inicio
                            </button>
                        </div>
                    )}

                    {/* 3. ACTIVE APP DEMO */}
                    {view === 'app' && selectedApp && (
                        <div className="w-full h-full relative bg-white animate-in zoom-in-95 duration-500">
                            <div style={{
                                width: '393px',
                                height: '852px',
                                transform: 'scale(0.72)',
                                transformOrigin: 'top left',
                                position: 'absolute',
                                top: '0px',
                                left: '0px',
                            }}>
                                <iframe
                                    src={selectedApp}
                                    className="w-full h-full border-none"
                                    title="App Demo"
                                    style={{ borderRadius: '0', paddingTop: '45px' }}
                                />
                            </div>

                            {/* Home Indicator (Exit) */}
                            <button
                                onClick={() => setView('list')}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/40 hover:bg-black/60 rounded-full z-30 transition-colors cursor-pointer backdrop-blur-md"
                            />
                        </div>
                    )}

                </div>
            </div>


        </motion.div>
    );
};
