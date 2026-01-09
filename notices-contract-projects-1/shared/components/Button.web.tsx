import React from 'react';

type Props = {
  onPress?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

const Button: React.FC<Props> = ({ onPress, children, className, 'data-testid': testId }) => {
  return (
    <button data-testid={testId} className={className} onClick={onPress} style={defaultStyle}>
      {children}
    </button>
  );
};

const defaultStyle: React.CSSProperties = {
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer'
};

export default Button;
