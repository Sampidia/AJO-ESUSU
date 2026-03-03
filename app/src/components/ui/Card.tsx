import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`relative rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.05] hover:border-white/10 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
        >
            {/* Subtle top-left highlight */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-br from-white/[0.05] to-transparent opacity-50 rounded-3xl"></div>

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <h3 className={`text-xl font-bold tracking-tight text-white ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mt-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mt-6 flex items-center justify-between ${className}`}>{children}</div>;
}
