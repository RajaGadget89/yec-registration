import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <input className={className} ref={ref} {...props}>
        {children}
      </input>
    );
  },
);

Input.displayName = "Input";
