import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import logo from '../../assets/creapp-logo.png';

interface ContactFormProps {
    onSuccess?: () => void;
    className?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSuccess, className = "" }) => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                if (onSuccess) onSuccess();
            }, 4500);
        }, 1500);
    };

    return (
        <div className={`transition-all duration-500 ${className}`}>
            {isSubmitted ? (
                <div className="p-8 md:p-12 text-center flex flex-col items-center overflow-hidden relative min-h-[400px] justify-center w-full">
                    {/* Starfield Background (Fades in) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="absolute inset-0 pointer-events-none"
                    >
                        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-60 animate-pulse" />
                        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40 animate-pulse delay-75" />
                        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-purple-400 rounded-full opacity-50 animate-pulse delay-150" />
                        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-white rounded-full opacity-30 animate-pulse delay-300" />
                    </motion.div>

                    {/* Rocket Animation */}
                    <motion.div
                        initial={{ y: 50, scale: 0.5, opacity: 0 }}
                        animate={{
                            y: [50, 50, -300], // Start low, wait, then launch UP
                            scale: [0.5, 1, 1],
                            opacity: [0, 1, 1]
                        }}
                        transition={{
                            duration: 1.5,
                            times: [0, 0.3, 1],
                            ease: "easeInOut"
                        }}
                        className="relative z-10 mb-8"
                    >
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center relative">
                            <img src={logo} alt="CreAPP Rocket" className="w-12 h-12 object-contain" />

                            {/* Engine Flame */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                                transition={{ delay: 0.5, duration: 1 }}
                                className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-12 bg-orange-500 blur-md rounded-full origin-top"
                            />
                        </div>
                    </motion.div>

                    {/* Success Badge (Appears in empty space) */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.2, type: "spring" }}
                        className="absolute top-0 left-0 right-0 bottom-1/3 flex items-center justify-center pointer-events-none"
                    >
                        <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                            <Check className="w-12 h-12 text-green-400 drop-shadow-md" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="relative z-20"
                    >
                        <h3 className="text-2xl font-display font-bold mb-2">¡Despegue Exitoso!</h3>
                        <p className="text-slate-400">Tu proyecto ha sido lanzado a nuestro equipo.</p>
                    </motion.div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 w-full">
                    {/* Inputs organized for both Modal and Landing scenarios */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Nombre" required />
                        <Input placeholder="Teléfono" type="tel" required />
                    </div>
                    <Input placeholder="Email" type="email" required />

                    <textarea
                        placeholder="Describe la problemática o idea..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none h-24 md:h-32 text-sm"
                        required
                    ></textarea>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Presupuesto</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="0.00"
                                    type="number"
                                    className="flex-1"
                                    required
                                />
                                <select className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors font-bold w-24 text-center">
                                    <option className="bg-surface-dark">USD</option>
                                    <option className="bg-surface-dark">ARS</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Urgencia</label>
                            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors">
                                <option className="bg-surface-dark text-slate-400">Seleccionar...</option>
                                <option className="bg-surface-dark">Baja (1-3 meses)</option>
                                <option className="bg-surface-dark">Media (1 mes)</option>
                                <option className="bg-surface-dark">Alta (ASAP)</option>
                            </select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full mt-4 h-12 md:h-14 text-base md:text-lg shadow-lg shadow-primary/20 group"
                        size="lg"
                        isLoading={isLoading}
                    >
                        Enviar Solicitud
                        {!isLoading && <Send className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                </form>
            )}
        </div>
    );
};
