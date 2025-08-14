'use client';

import { useState } from 'react';
import { Check, X, RefreshCw, Loader2 } from 'lucide-react';
import type { Registration } from '../../types/database';

interface ActionButtonsProps {
  registration: Registration;
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

export default function ActionButtons({ registration, onActionComplete }: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject' | 'request-update') => {
    if (isLoading) return;
    
    setIsLoading(true);
    setCurrentAction(action);

    try {
      const response = await fetch(`/api/admin/registrations/${registration.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.ok) {
        // Call the callback to update the UI
        if (onActionComplete) {
          onActionComplete(registration.registration_id, result.status);
        }
        
        // Show success message
        // You can implement a toast notification here
        console.log(`${action} action successful for registration ${registration.registration_id}`);
      } else {
        console.error(`${action} action failed:`, result.error);
        // You can implement error toast notification here
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
      // You can implement error toast notification here
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  };

  const isActionDisabled = (action: string) => {
    if (isLoading) return true;
    
    // Disable actions based on current status
    switch (action) {
      case 'approve':
        return registration.status === 'approved';
      case 'reject':
        return registration.status === 'rejected';
      case 'request-update':
        return registration.status === 'waiting_for_review';
      default:
        return false;
    }
  };

  const getActionButton = (action: 'approve' | 'reject' | 'request-update') => {
    const config = {
      approve: {
        label: 'Approve',
        icon: Check,
        className: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
        loadingText: 'Approving...'
      },
      reject: {
        label: 'Reject',
        icon: X,
        className: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
        loadingText: 'Rejecting...'
      },
      'request-update': {
        label: 'Request Update',
        icon: RefreshCw,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500',
        loadingText: 'Requesting...'
      }
    };

    const { label, icon: Icon, className, loadingText } = config[action];
    const disabled = isActionDisabled(action);
    const isCurrentAction = currentAction === action;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAction(action);
        }}
        disabled={disabled}
        className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300'
            : className
        } hover:scale-105`}
      >
        {isCurrentAction && isLoading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="whitespace-nowrap">{loadingText}</span>
          </>
        ) : (
          <>
            <Icon className="w-3 h-3" />
            <span className="whitespace-nowrap">{label}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {getActionButton('approve')}
      {getActionButton('reject')}
      {getActionButton('request-update')}
    </div>
  );
}
