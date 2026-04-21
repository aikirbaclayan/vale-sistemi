import React, { useState, useEffect } from 'react';
import { normalizePlate } from '../services/api';

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation?: (isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const PlateInput: React.FC<PlateInputProps> = ({
  value,
  onChange,
  onValidation,
  placeholder = "34ABC123",
  className = '',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Sadece harf ve rakam kabul et, otomatik büyük harf
    inputValue = inputValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Görsel formatı: 34 ABC 123
    let formattedValue = inputValue;
    if (inputValue.length > 2 && inputValue.length <= 5) {
      formattedValue = `${inputValue.slice(0, 2)} ${inputValue.slice(2)}`;
    } else if (inputValue.length > 5) {
      formattedValue = `${inputValue.slice(0, 2)} ${inputValue.slice(2, 5)} ${inputValue.slice(5)}`;
    }
    
    setDisplayValue(formattedValue);
    
    // Normalize edilmiş değeri parent'a gönder
    const normalizedValue = normalizePlate(inputValue);
    onChange(normalizedValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={10} // "34 ABC 123" formatı için
      className={`
        w-full px-4 py-3 text-lg font-mono text-center
        border-2 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
};

export default PlateInput;
