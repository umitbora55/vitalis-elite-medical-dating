import React from 'react';

interface BrandLogoProps {
    size?: number;
    className?: string;
    variant?: 'gold' | 'outline' | 'slate';
}

/**
 * BrandLogo Component
 * 
 * Implements the user's favorite logo design:
 * - Rounded square (squircle-like)
 * - Gold/Amber premium gradient
 * - Elegant serif 'V' (Playfair Display)
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
    size = 48,
    className = '',
    variant = 'gold'
}) => {
    const variants = {
        gold: "bg-gradient-to-br from-gold-500 via-gold-400 to-amber-500 shadow-glow-gold",
        outline: "bg-slate-900/40 border border-gold-500/20 backdrop-blur-xl shadow-xl",
        slate: "bg-slate-900 border border-slate-800 shadow-inner",
    };

    return (
        <div
            className={`flex items-center justify-center transition-all duration-300 rounded-[28%] overflow-hidden ${variants[variant]} ${className}`}
            style={{ width: size, height: size }}
        >
            <span
                className="text-slate-950 font-serif font-bold leading-none select-none select-none translate-y-[1%]"
                style={{ fontSize: size * 0.58 }}
            >
                V
            </span>
        </div>
    );
};

export default BrandLogo;
