import type { ChangeEvent } from 'react';

interface BaseProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  className?: string;
}

interface TextFieldProps extends BaseProps {
  type?: 'text' | 'email' | 'tel' | 'password' | 'date' | 'number';
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  autoComplete,
  className = '',
  type = 'text',
}: TextFieldProps) {
  return (
    <div className={`field ${error ? 'error' : ''} ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface TextAreaFieldProps extends BaseProps {
  rows?: number;
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  className = '',
  rows = 4,
}: TextAreaFieldProps) {
  return (
    <div className={`field ${error ? 'error' : ''} ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
