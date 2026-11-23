import React, { useState, useEffect } from 'react';
import { formatRupiah, parseRupiah, cn } from '../utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(formatRupiah(value));

  useEffect(() => {
    setDisplayValue(formatRupiah(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseRupiah(rawValue);
    onChange(numericValue);
    setDisplayValue(formatRupiah(numericValue));
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
      />
    </div>
  );
};
