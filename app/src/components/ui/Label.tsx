import React from "react";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

export function Label({ className = "", ...props }: LabelProps) {
    return (
        <label
            className={`text-sm font-semibold leading-none text-gray-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
            {...props}
        />
    );
}
