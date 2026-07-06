import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MeetingScheduler } from './MeetingScheduler';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl z-[101] p-4"
                    >
                        <div className="bg-surface-dark border border-white/10 rounded-3xl shadow-2xl relative">
                            <div className="absolute top-0 right-0 p-4 z-10">
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-6 sm:p-8">
                                <div className="text-center mb-6">
                                    <h2 className="font-display text-2xl font-bold mb-1.5">Agenda una llamada</h2>
                                    <p className="text-slate-400 text-xs sm:text-sm">
                                        Elige el tipo de reunión, fecha y hora que más te convengan para conversar.
                                    </p>
                                </div>

                                <MeetingScheduler onSuccess={onClose} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
