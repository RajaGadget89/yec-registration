'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface QRScannerProps {
  onQRCodeDetected: (data: string) => void;
  onError: (error: string) => void;
  active: boolean;
}

export default function QRScanner({ onQRCodeDetected, onError, active }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  // const scannerRef = useRef<any>(null);

  const checkCameraPermission = useCallback(async () => {
    try {
      // Try with more flexible constraints to avoid OverconstrainedError
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setHasPermission(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      
      if (error instanceof Error && error.name === 'OverconstrainedError') {
        onError('Camera constraints not supported. Please try a different camera or device.');
      } else {
        onError('Camera access denied. Please allow camera access to scan QR codes.');
      }
    }
  }, [onError]);

  useEffect(() => {
    if (active) {
      checkCameraPermission();
    }
  }, [active, checkCameraPermission]);

  const handleQRCodeDetected = (result: string) => {
    if (isScanning) return; // Prevent multiple scans
    
    setIsScanning(true);
    onQRCodeDetected(result);
    
    // Reset scanning state after a delay
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    onError('QR code scanning error. Please try again.');
  };

  if (!active) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Select an event to start scanning</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Camera Access Required</div>
          <p className="text-red-600 text-sm">
            Please allow camera access to scan QR codes.
          </p>
          <button
            onClick={checkCameraPermission}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Scanner
          onScan={(detectedCodes) => {
            if (detectedCodes.length > 0) {
              handleQRCodeDetected(detectedCodes[0].rawValue);
            }
          }}
          onError={handleError}
          constraints={{
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          }}
          styles={{
            container: {
              width: '100%',
              height: '300px',
              borderRadius: '8px',
              overflow: 'hidden',
            },
            video: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }
          }}
        />
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
            <div className="bg-green-500 text-white px-4 py-2 rounded-md">
              QR Code Detected!
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Point your camera at the QR code on the user's badge
        </p>
      </div>
    </div>
  );
}
