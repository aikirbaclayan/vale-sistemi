import React from 'react';
import { getStatusColor, getStatusText } from '../utils';

interface StatusChipProps {
  status: string;
  className?: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  return (
    <span 
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border
        ${getStatusColor(status)} ${className}
      `}
    >
      {getStatusText(status)}
    </span>
  );
};

export default StatusChip;
