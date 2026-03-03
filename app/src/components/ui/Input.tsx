import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input({ className = "", ...props }: InputProps) {
    return (
        <input
            className={`flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/40 focus-visible:border-purple-600/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

export function Label({ className = "", ...props }: LabelProps) {
    return (
        <label
            className={`text-sm font-semibold leading-none text-gray-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
            {...props}
        />
    );
}
