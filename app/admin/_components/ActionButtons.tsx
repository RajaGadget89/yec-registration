'use client';

import { useState } from 'react';
import { Check, X, RefreshCw, Loader2, CreditCard, User, FileText } from 'lucide-react';
import type { Registration } from '../../types/database';

interface ActionButtonsProps {
  registration: Registration;
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

export default function ActionButtons({ registration, onActionComplete }: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const handleDimensionAction = async (action: 'request-update' | 'mark-pass', dimension: 'payment' | 'profile' | 'tcc', notes?: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setCurrentAction(`${action}-${dimension}`);

    try {
      const endpoint = action === 'request-update' ? 'request-update' : 'mark-pass';
      const body = action === 'request-update' 
        ? { dimension, notes } 
        : { dimension };

      const response = await fetch(`/api/admin/registrations/${registration.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.ok) {
        // Call the callback to update the UI
        if (onActionComplete) {
          onActionComplete(registration.registration_id, result.status);
        }
        
        // Show success message
        console.log(`${action} ${dimension} action successful for registration ${registration.registration_id}`);
      } else {
        console.error(`${action} ${dimension} action failed:`, result.error);
        // You can implement error toast notification here
      }
    } catch (error) {
      console.error(`Error performing ${action} ${dimension} action:`, error);
      // You can implement error toast notification here
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  };

  const handleLegacyAction = async (action: 'approve' | 'reject') => {
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

  const getDimensionStatus = (dimension: 'payment' | 'profile' | 'tcc') => {
    const checklist = registration.review_checklist;
    if (!checklist) return 'pending';
    return checklist[dimension]?.status || 'pending';
  };

  const isActionDisabled = (action: string, dimension?: string) => {
    if (isLoading) return true;
    
    if (dimension) {
      const status = getDimensionStatus(dimension as 'payment' | 'profile' | 'tcc');
      switch (action) {
        case 'request-update':
          return status === 'needs_update' || status === 'rejected';
        case 'mark-pass':
          return status === 'passed' || status === 'rejected';
        default:
          return false;
      }
    } else {
      // Legacy actions
      switch (action) {
        case 'approve':
          return registration.status === 'approved';
        case 'reject':
          return registration.status === 'rejected';
        default:
          return false;
      }
    }
  };

  const getDimensionButton = (dimension: 'payment' | 'profile' | 'tcc') => {
    const status = getDimensionStatus(dimension);
    const isCurrentAction = currentAction === `request-update-${dimension}` || currentAction === `mark-pass-${dimension}`;
    
    const dimensionConfig = {
      payment: { icon: CreditCard, label: 'Payment', color: 'blue' },
      profile: { icon: User, label: 'Profile', color: 'green' },
      tcc: { icon: FileText, label: 'TCC', color: 'purple' }
    };

    const config = dimensionConfig[dimension];
    const Icon = config.icon;
    void Icon; // used to satisfy lint without changing config

    return (
      <div key={dimension} className="flex flex-col gap-1">
        <div className="text-xs font-medium text-gray-600">{config.label}</div>
        <div className="flex gap-1">
          {/* Request Update Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const notes = prompt(`Enter notes for ${dimension} update request (optional):`);
              handleDimensionAction('request-update', dimension, notes || undefined);
            }}
            disabled={isActionDisabled('request-update', dimension)}
            className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled('request-update', dimension)
                ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500'
            } hover:scale-105`}
          >
            {isCurrentAction && currentAction === `request-update-${dimension}` ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="whitespace-nowrap">Requesting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span className="whitespace-nowrap">Request</span>
              </>
            )}
          </button>

          {/* Mark Pass Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDimensionAction('mark-pass', dimension);
            }}
            disabled={isActionDisabled('mark-pass', dimension)}
            className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
              isActionDisabled('mark-pass', dimension)
                ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300'
                : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
            } hover:scale-105`}
          >
            {isCurrentAction && currentAction === `mark-pass-${dimension}` ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="whitespace-nowrap">Marking...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                <span className="whitespace-nowrap">Pass</span>
              </>
            )}
          </button>
        </div>
        
        {/* Status Badge */}
        <div className={`text-xs px-2 py-1 rounded-full text-center ${
          status === 'passed' ? 'bg-green-100 text-green-800' :
          status === 'needs_update' ? 'bg-yellow-100 text-yellow-800' :
          status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status.replace('_', ' ')}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Dimension-specific actions */}
      <div className="grid grid-cols-3 gap-2">
        {getDimensionButton('payment')}
        {getDimensionButton('profile')}
        {getDimensionButton('tcc')}
      </div>
      
      {/* Legacy actions (for backward compatibility) */}
      <div className="flex flex-wrap items-center gap-1 pt-2 border-t">
        <span className="text-xs text-gray-500 mr-2">Legacy:</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLegacyAction('approve');
          }}
          disabled={isActionDisabled('approve')}
          className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
            isActionDisabled('approve')
              ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300'
              : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
          } hover:scale-105`}
        >
          {currentAction === 'approve' && isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="whitespace-nowrap">Approving...</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              <span className="whitespace-nowrap">Approve All</span>
            </>
          )}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLegacyAction('reject');
          }}
          disabled={isActionDisabled('reject')}
          className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border ${
            isActionDisabled('reject')
              ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300'
              : 'bg-red-500 hover:bg-red-600 text-white border-red-500'
          } hover:scale-105`}
        >
          {currentAction === 'reject' && isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="whitespace-nowrap">Rejecting...</span>
            </>
          ) : (
            <>
              <X className="w-3 h-3" />
              <span className="whitespace-nowrap">Reject All</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
