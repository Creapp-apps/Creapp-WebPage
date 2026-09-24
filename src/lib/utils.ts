import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function parseProposalNumericValue(val: string | number | null | undefined): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let str = String(val)
        .replace(/USD|ARS|EUR|CLP|MXN|UYU|BRL|PEN|COP|\$/gi, '')
        .trim();

    if (!str) return 0;

    // Both dots and commas present
    if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // Latin format: 1.500.000,50 -> remove dots, replace comma with dot
            return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
        } else {
            // US format: 1,500,000.50 -> remove commas
            return parseFloat(str.replace(/,/g, '')) || 0;
        }
    }

    // Only dots present (e.g. 1.500.000 or 1.500 or 1.5)
    if (str.includes('.')) {
        const parts = str.split('.');
        if (parts.length > 2 || parts[1].length === 3) {
            return parseFloat(str.replace(/\./g, '')) || 0;
        }
        return parseFloat(str) || 0;
    }

    // Only commas present (e.g. 1,500,000 or 1,5)
    if (str.includes(',')) {
        const parts = str.split(',');
        if (parts.length > 2 || parts[1].length === 3) {
            return parseFloat(str.replace(/,/g, '')) || 0;
        }
        return parseFloat(str.replace(/,/g, '.')) || 0;
    }

    return parseFloat(str) || 0;
}
