"use client";

import React, { useState } from "react";

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    className?: string;
}

export function Tooltip({ children, content, className = "" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 
                    bg-red-600 text-white text-[10px] font-bold rounded-lg 
                    w-32 text-center shadow-xl shadow-red-500/20 z-50
                    animate-in fade-in zoom-in-95 duration-200
                    ${className}
                `}>
                    {content}
                    {/* Triangle pointer */}
                    <div className="absolute top-[90%] left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rotate-45 -z-10" />
                </div>
            )}
        </div>
    );
}
