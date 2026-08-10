import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Video,
    Phone,
    Clock,
    Globe,
    ArrowLeft,
    ArrowRight,
    Check,
    CalendarPlus,
    MessageSquare,
    MessageCircle,
    User,
    Mail,
    PhoneCall,
    Sparkles,
    ChevronDown,
} from 'lucide-react';
import logo from '../../assets/creapp-logo.png';
import { supabase } from '../../lib/supabaseClient';

interface CustomSelectProps {
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div ref={dropdownRef} className="relative w-full text-left">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer focus:outline-none transition-all hover:bg-white/[0.07] ${
                    isOpen ? 'border-cyan-electric/50 ring-1 ring-cyan-electric/50' : 'border-white/10'
                }`}
            >
                <span className="truncate">{selectedOption.label}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute z-50 left-0 right-0 mt-1.5 bg-[#120F24]/98 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.6)] max-h-60 overflow-y-auto"
                    >
                        <div className="p-1">
                            {options.map((option) => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-xs sm:text-sm rounded-lg transition-all flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-white/[0.08] text-cyan-electric font-semibold'
                                                : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-cyan-electric stroke-[3] flex-shrink-0 ml-2" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};



const urgencyOptions = [
    { value: 'Baja (1-3 meses)', label: 'Baja (1-3 meses)' },
    { value: 'Media (1 mes)', label: 'Media (1 mes)' },
    { value: 'Alta (ASAP)', label: 'Alta (ASAP)' },
];

interface MeetingSchedulerProps {
    onSuccess?: () => void;
    className?: string;
}

interface TimeSlot {
    time: string;
    available: boolean;
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({
    onSuccess,
    className = '',
}) => {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const [isAnimating, setIsAnimating] = useState(false);

    const stepVariants: any = {
        enter: (dir: number) => ({
            x: dir * 40,
            opacity: 0,
            scale: 0.98,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: 'spring' as const, stiffness: 350, damping: 32 },
                opacity: { duration: 0.25 },
                scale: { duration: 0.3, ease: 'easeOut' as const },
            }
        },
        exit: (dir: number) => ({
            x: -dir * 40,
            opacity: 0,
            scale: 0.98,
            transition: {
                x: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 },
                scale: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
        })
    };

    const [meetingType, setMeetingType] = useState<'video' | 'voice' | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timezone, setTimezone] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        idea: '',
        budget: '',
        urgency: 'Media (1 mes)',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [datesList, setDatesList] = useState<Date[]>([]);
    
    const calendarScrollRef = useRef<HTMLDivElement>(null);

    // Detect user timezone on mount
    useEffect(() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setTimezone(tz || 'America/Argentina/Buenos_Aires');
        } catch (e) {
            setTimezone('America/Argentina/Buenos_Aires');
        }
    }, []);

    // Generate next 10 business days (skipping Saturday and Sunday)
    useEffect(() => {
        const list: Date[] = [];
        let current = new Date();
        
        // If it's already late in the day (e.g. past 18:00), start booking from tomorrow
        if (current.getHours() >= 18) {
            current.setDate(current.getDate() + 1);
        }

        while (list.length < 10) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 6 = Saturday
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                list.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
        setDatesList(list);
        
        // Auto-select the first day
        if (list.length > 0) {
            setSelectedDate(list[0]);
        }
    }, []);

    // Hours list
    const defaultTimeSlots = [
        '09:30',
        '11:00',
        '12:30',
        '14:00',
        '15:30',
        '17:00',
    ];

    // Filter out past hours if selected date is today
    const getTimeSlotsForSelectedDate = (): TimeSlot[] => {
        if (!selectedDate) return [];
        const isToday = new Date().toDateString() === selectedDate.toDateString();
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();

        return defaultTimeSlots.map((slot) => {
            const [hourStr, minStr] = slot.split(':');
            const slotHour = parseInt(hourStr, 10);
            const slotMin = parseInt(minStr, 10);

            let available = true;
            if (isToday) {
                // If it has already passed or is within the next 30 minutes, make it unavailable
                if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMinute + 30)) {
                    available = false;
                }
            }
            return { time: slot, available };
        });
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null); // Reset selected time when date changes
    };

    const handleNext = () => {
        setDirection(1);
        setIsAnimating(true);
        if (step === 1 && meetingType) setStep(2);
        else if (step === 2 && selectedDate && selectedTime) setStep(3);
    };

    const handleBack = () => {
        setDirection(-1);
        setIsAnimating(true);
        if (step > 1) setStep(step - 1);
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.from('leads').insert([
                {
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    idea: formData.idea,
                    budget: formData.budget,
                    urgency: formData.urgency,
                    meeting_type: meetingType,
                    meeting_date: selectedDate ? selectedDate.toISOString().split('T')[0] : null,
                    meeting_time: selectedTime,
                    timezone: timezone,
                }
            ]);

            if (error) {
                console.error('Error saving lead to Supabase:', error);
            }
        } catch (err) {
            console.error('Failed to insert lead:', err);
        } finally {
            setIsLoading(false);
            setDirection(1);
            setStep(4);
        }
    };

    // Date formatting helper (Spanish)
    const formatDateSpanish = (date: Date): string => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
    };

    const getShortDayName = (date: Date): string => {
        const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return daysShort[date.getDay()];
    };

    const getShortMonthName = (date: Date): string => {
        const monthsShort = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return monthsShort[date.getMonth()];
    };

    // Google Calendar Event Link Generator
    const getGoogleCalendarUrl = () => {
        if (!selectedDate || !selectedTime) return '#';
        
        // Parse selectedDate and selectedTime
        const [hours, minutes] = selectedTime.split(':');
        const start = new Date(selectedDate);
        start.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
        
        const end = new Date(start);
        end.setMinutes(start.getMinutes() + 30); // 30 mins meeting

        const formatDateToGcal = (d: Date) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const title = encodeURIComponent(`Llamada de Descubrimiento con CreAPP - ${formData.name}`);
        const dates = `${formatDateToGcal(start)}/${formatDateToGcal(end)}`;
        const details = encodeURIComponent(
            `Hola ${formData.name}!\n\nGracias por agendar tu llamada con CreAPP. Conversaremos sobre:\n` +
            `"${formData.idea || 'Tu idea de proyecto'}"\n\n` +
            `• Tipo: ${meetingType === 'video' ? 'Videollamada de Google Meet (link automático en el evento)' : 'Llamada telefónica a tu número: ' + formData.phone}\n` +
            `• Presupuesto estimado: ${formData.budget}\n` +
            `• Urgencia: ${formData.urgency}\n\n` +
            `Nos conectamos a la hora programada. ¡Saludos!\n- Equipo de CreAPP`
        );
        const location = encodeURIComponent(meetingType === 'video' ? 'Google Meet' : `Llamada Telefónica a ${formData.phone}`);

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    };

    // WhatsApp Message URL Generator
    const getWhatsAppUrl = () => {
        const dateStr = selectedDate ? formatDateSpanish(selectedDate) : '';
        const text = encodeURIComponent(
            `¡Hola CreAPP! Acabo de agendar una llamada con ustedes.\n\n` +
            `• *Nombre*: ${formData.name}\n` +
            `• *Reunión*: ${meetingType === 'video' ? 'Videollamada' : 'Llamada de Voz'}\n` +
            `• *Fecha*: ${dateStr} a las ${selectedTime} hs\n` +
            `• *Proyecto*: ${formData.idea || 'Sin detalles previos'}\n` +
            `• *Presupuesto*: ${formData.budget}\n\n` +
            `¡Quedo a la espera de confirmación!`
        );
        // Replace with your real team number or general business number
        return `https://wa.me/5491136923899?text=${text}`;
    };

    // Step 1: Format & Type
    const renderStep1 = () => (
        <motion.div
            key="step1"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onAnimationComplete={() => setIsAnimating(false)}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voice Call Card */}
                <button
                    type="button"
                    onClick={() => setMeetingType('voice')}
                    className={`p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 relative group overflow-hidden ${
                        meetingType === 'voice'
                            ? 'bg-white/[0.04] border-cyan-electric shadow-[0_0_30px_rgba(255,45,120,0.15)]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                    }`}
                >
                    {meetingType === 'voice' && (
                        <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-cyan-electric flex items-center justify-center text-black">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        meetingType === 'voice' ? 'bg-cyan-electric/20 text-cyan-electric' : 'bg-white/5 text-slate-400'
                    }`}>
                        <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-1">Llamada de Voz</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        WhatsApp o Celular tradicional. Rápido y directo. Ideal para consultas puntuales.
                    </p>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-electric/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Video Call Card */}
                <button
                    type="button"
                    onClick={() => setMeetingType('video')}
                    className={`p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 relative group overflow-hidden ${
                        meetingType === 'video'
                            ? 'bg-white/[0.04] border-purple-digital shadow-[0_0_30px_rgba(155,48,255,0.15)]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                    }`}
                >
                    {meetingType === 'video' && (
                        <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-purple-digital flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        meetingType === 'video' ? 'bg-purple-digital/20 text-purple-digital' : 'bg-white/5 text-slate-400'
                    }`}>
                        <Video className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 mb-2">
                        <h3 className="font-display text-lg font-bold text-white leading-none">Videollamada</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-digital/20 text-purple-300 border border-purple-digital/30">
                            Recomendado
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        Google Meet. Ideal para compartir pantalla, revisar mockups y estructurar tu proyecto.
                    </p>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-digital/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Timezone Info */}
            <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-slate-400">
                <Globe className="w-4 h-4 text-cyan-electric/80 animate-pulse" />
                <span>
                    Configurado en tu zona horaria: <strong className="text-slate-300">{timezone}</strong>
                </span>
            </div>

            {/* CTA Button */}
            <button
                type="button"
                disabled={!meetingType}
                onClick={handleNext}
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-electric to-purple-digital text-black disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all"
            >
                Continuar
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );

    // Step 2: Date & Time Picker
    const renderStep2 = () => {
        const slots = getTimeSlotsForSelectedDate();

        return (
            <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onAnimationComplete={() => setIsAnimating(false)}
                className="space-y-6"
            >
                {/* Horizontal Date Picker Stripe */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Selecciona un Día
                    </label>
                    <div
                        ref={calendarScrollRef}
                        className="flex gap-2.5 overflow-x-auto pt-2.5 pb-3 px-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 no-scrollbar"
                    >
                        {datesList.map((date, idx) => {
                            const isSelected =
                                selectedDate &&
                                date.toDateString() === selectedDate.toDateString();
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleDateSelect(date)}
                                    className={`flex-shrink-0 w-[72px] py-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                        isSelected
                                            ? 'bg-white/[0.06] border-cyan-electric text-white shadow-[0_0_15px_rgba(255,45,120,0.15)] scale-105'
                                            : 'bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                    }`}
                                >
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                        {getShortDayName(date)}
                                    </span>
                                    <span className="text-xl font-bold my-0.5">
                                        {date.getDate()}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest opacity-60">
                                        {getShortMonthName(date)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Grid of Time Slots */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Horarios Disponibles
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Duración: 30 min
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        {slots.map((slot) => (
                            <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => setSelectedTime(slot.time)}
                                className={`py-3 rounded-xl border font-mono font-bold text-sm tracking-wider transition-all ${
                                    !slot.available
                                        ? 'bg-white/[0.01] border-white/5 text-slate-600 cursor-not-allowed opacity-30 line-through'
                                        : selectedTime === slot.time
                                        ? 'bg-white/[0.06] border-purple-digital text-white shadow-[0_0_15px_rgba(155,48,255,0.15)]'
                                        : 'bg-white/[0.02] border-white/5 text-slate-300 hover:border-white/15 hover:bg-white/[0.03]'
                                }`}
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Back / Next Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="h-12 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Atrás
                    </button>
                    <button
                        type="button"
                        disabled={!selectedDate || !selectedTime}
                        onClick={handleNext}
                        className="h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-electric to-purple-digital text-black disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all"
                    >
                        Continuar
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        );
    };

    // Step 3: Contact Form & Brief
    const renderStep3 = () => (
        <motion.div
            key="step3"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onAnimationComplete={() => setIsAnimating(false)}
            className="space-y-4"
        >
            <form onSubmit={handleBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Nombre"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/50 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="relative">
                        <PhoneCall className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        <input
                            type="tel"
                            placeholder="WhatsApp / Tel."
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/50 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                        type="email"
                        placeholder="Correo Electrónico"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/50 transition-all text-sm font-medium"
                    />
                </div>

                <div className="space-y-1">
                    <textarea
                        placeholder="¿Qué tienes en mente o cuál es tu objetivo principal?"
                        value={formData.idea}
                        onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/50 transition-all resize-none h-20 text-sm font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
                            Presupuesto
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: $10,000 USD"
                            required
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/50 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
                            Urgencia
                        </label>
                        <CustomSelect
                            value={formData.urgency}
                            options={urgencyOptions}
                            onChange={(val) => setFormData({ ...formData, urgency: val })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="h-12 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Atrás
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !formData.name || !formData.phone || !formData.email}
                        className="h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-electric to-purple-digital text-black disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all"
                    >
                        {isLoading ? 'Procesando...' : 'Confirmar Llamada'}
                    </button>
                </div>
            </form>
        </motion.div>
    );

    // Step 4: Booking Complete / Actions
    const renderStep4 = () => {
        const formattedDate = selectedDate ? formatDateSpanish(selectedDate) : '';

        return (
            <motion.div
                key="step4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onAnimationComplete={() => setIsAnimating(false)}
                className="text-center space-y-6 py-4"
            >
                {/* Celebratory Rocket Space Backdrop */}
                <div className="relative w-24 h-24 mx-auto mb-2">
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: 'easeInOut',
                        }}
                        className="w-24 h-24 bg-gradient-to-tr from-cyan-electric/20 to-purple-digital/20 rounded-full flex items-center justify-center border border-white/10"
                    >
                        <img src={logo} alt="CreAPP Rocket" className="w-14 h-14 object-contain" />
                    </motion.div>
                    
                    {/* Glowing ring */}
                    <div className="absolute inset-0 bg-cyan-electric/10 rounded-full blur-xl scale-125 -z-10 animate-pulse" />
                    
                    {/* Tiny Check bubble */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-surface-dark">
                        <Check className="w-4 h-4 text-black stroke-[3]" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                        ¡Llamada Agendada!
                    </h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                        Hemos reservado tu espacio para el día <strong className="text-white">{formattedDate}</strong> a las <strong className="text-white">{selectedTime} hs</strong> ({timezone}).
                    </p>
                </div>

                {/* Call specs badge */}
                <div className="inline-flex flex-col items-start gap-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-left w-full max-w-sm mx-auto">
                    <div className="flex items-center gap-2 text-slate-300">
                        {meetingType === 'video' ? (
                            <>
                                <Video className="w-4 h-4 text-purple-digital" />
                                <span>Reunión de Video por <strong>Google Meet</strong></span>
                            </>
                        ) : (
                            <>
                                <Phone className="w-4 h-4 text-cyan-electric" />
                                <span>Llamada de Voz al <strong>{formData.phone}</strong></span>
                            </>
                        )}
                    </div>
                    <div className="w-full h-[1px] bg-white/5" />
                    <p className="text-slate-400 leading-normal">
                        Te hemos enviado los detalles a <span className="text-slate-300">{formData.email}</span>. Si elegiste videollamada, el enlace de Meet se creará automáticamente en tu calendario.
                    </p>
                </div>

                {/* Post-booking action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto pt-2">
                    {/* Google Calendar Link */}
                    <a
                        href={getGoogleCalendarUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <CalendarPlus className="w-4 h-4 text-cyan-electric" />
                        Añadir a Google Calendar
                    </a>

                    {/* WhatsApp confirmation */}
                    <a
                        href={getWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-12 rounded-xl bg-green-500 hover:bg-green-600 hover:scale-[1.02] text-black text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    >
                        <MessageCircle className="w-4 h-4 fill-black text-transparent" />
                        Confirmar por WhatsApp
                    </a>
                </div>

                {/* Back button or closing helper */}
                <button
                    type="button"
                    onClick={() => {
                        if (onSuccess) onSuccess();
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest pt-2"
                >
                    Volver a la Web
                </button>
            </motion.div>
        );
    };

    return (
        <div className={`w-full transition-all duration-300 ${className}`}>
            {/* Header progress timeline */}
            {step < 4 && (
                <div className="flex items-center justify-center gap-2 mb-8 select-none">
                    {[1, 2, 3].map((num) => {
                        const isActive = step === num;
                        const isDone = step > num;
                        return (
                            <React.Fragment key={num}>
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-cyan-electric to-purple-digital text-black scale-110 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                                            : isDone
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-white/5 text-slate-500 border border-white/5'
                                    }`}
                                >
                                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : num}
                                </div>
                                {num < 3 && (
                                    <div
                                        className={`h-[2px] w-8 transition-all duration-500 rounded-full ${
                                            step > num
                                                ? 'bg-green-500/40'
                                                : step === num
                                                ? 'bg-cyan-electric/40'
                                                : 'bg-white/5'
                                        }`}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Stepper Panels */}
            <motion.div
                layout
                className={`relative ${isAnimating ? 'overflow-hidden' : 'overflow-visible'}`}
                transition={{
                    layout: { type: "spring", stiffness: 350, damping: 32 }
                }}
                onLayoutAnimationStart={() => setIsAnimating(true)}
                onLayoutAnimationComplete={() => setIsAnimating(false)}
            >
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
