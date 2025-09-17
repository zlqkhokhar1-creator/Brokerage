import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronRight, Shield, Lock, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SlidePoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SlideData {
  path: SlidePoint[];
  velocityPoints: number[];
  startTime: number;
  endTime: number;
  distance: number;
  duration: number;
  velocity: number;
}

interface SlideToExecuteProps {
  orderData: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: string;
    price?: number;
    estimatedValue: number;
    estimatedFees: number;
  };
  slideRequirements: {
    securityLevel: 'STANDARD' | 'MEDIUM' | 'HIGH';
    biometric: boolean;
    deviceVerification: boolean;
    locationVerification: boolean;
    slideComplexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
  };
  riskWarnings: string[];
  onExecute: (slideData: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const SlideToExecute: React.FC<SlideToExecuteProps> = ({
  orderData,
  slideRequirements,
  riskWarnings,
  onExecute,
  onCancel,
  isLoading = false
}) => {
  const [slideProgress, setSlideProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideCompleted, setSlideCompleted] = useState(false);
  const [securityChecks, setSecurityChecks] = useState({
    deviceVerified: false,
    biometricCompleted: false,
    locationVerified: false
  });
  const [slideData, setSlideData] = useState<SlideData>({
    path: [],
    velocityPoints: [],
    startTime: 0,
    endTime: 0,
    distance: 0,
    duration: 0,
    velocity: 0
  });

  const slideRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const progress = useTransform(x, [0, 300], [0, 1]);
  const opacity = useTransform(x, [0, 300], [1, 0]);
  const scale = useTransform(x, [0, 300], [1, 0.8]);

  // Security level colors
  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-500 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      default: return 'text-green-500 bg-green-50 border-green-200';
    }
  };

  // Handle slide start
  const handleSlideStart = useCallback(() => {
    setIsSliding(true);
    setSlideData(prev => ({
      ...prev,
      startTime: Date.now(),
      path: [],
      velocityPoints: []
    }));
  }, []);

  // Handle slide progress
  const handleSlide = useCallback((event: any, info: PanInfo) => {
    const currentProgress = Math.min(info.point.x / 300, 1);
    setSlideProgress(currentProgress);

    // Track slide path for security analysis
    setSlideData(prev => ({
      ...prev,
      path: [...prev.path, {
        x: info.point.x,
        y: info.point.y,
        timestamp: Date.now()
      }],
      velocityPoints: [...prev.velocityPoints, info.velocity.x]
    }));

    // Check if slide is completed (80% of track)
    if (currentProgress >= 0.8 && !slideCompleted) {
      setSlideCompleted(true);
    }
  }, [slideCompleted]);

  // Handle slide end
  const handleSlideEnd = useCallback(async (event: any, info: PanInfo) => {
    const endTime = Date.now();
    const finalProgress = Math.min(info.point.x / 300, 1);
    
    setIsSliding(false);

    if (finalProgress >= 0.8 && slideCompleted) {
      // Calculate final slide data
      const finalSlideData = {
        ...slideData,
        endTime,
        duration: endTime - slideData.startTime,
        distance: finalProgress,
        velocity: Math.abs(info.velocity.x),
        deviceFingerprint: await generateDeviceFingerprint(),
        biometricToken: securityChecks.biometricCompleted ? await getBiometricToken() : null,
        location: securityChecks.locationVerified ? await getCurrentLocation() : null
      };

      try {
        await onExecute(finalSlideData);
      } catch (error) {
        // Reset slide on error
        x.set(0);
        setSlideProgress(0);
        setSlideCompleted(false);
      }
    } else {
      // Reset slide if not completed
      x.set(0);
      setSlideProgress(0);
      setSlideCompleted(false);
    }
  }, [slideData, slideCompleted, securityChecks, onExecute, x]);

  // Perform security checks
  useEffect(() => {
    const performSecurityChecks = async () => {
      // Device verification
      if (slideRequirements.deviceVerification) {
        const deviceVerified = await verifyDevice();
        setSecurityChecks(prev => ({ ...prev, deviceVerified }));
      }

      // Location verification
      if (slideRequirements.locationVerification) {
        const locationVerified = await verifyLocation();
        setSecurityChecks(prev => ({ ...prev, locationVerified }));
      }
    };

    performSecurityChecks();
  }, [slideRequirements]);

  // Handle biometric authentication
  const handleBiometricAuth = async () => {
    try {
      const biometricResult = await authenticateWithBiometrics();
      setSecurityChecks(prev => ({ ...prev, biometricCompleted: biometricResult }));
    } catch (error) {
      console.error('Biometric authentication failed:', error);
    }
  };

  // Check if all security requirements are met
  const allSecurityChecksPassed = () => {
    if (slideRequirements.biometric && !securityChecks.biometricCompleted) return false;
    if (slideRequirements.deviceVerification && !securityChecks.deviceVerified) return false;
    if (slideRequirements.locationVerification && !securityChecks.locationVerified) return false;
    return true;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order Confirmation</span>
            <Badge variant="outline" className={getSecurityColor(slideRequirements.securityLevel)}>
              <Shield className="w-3 h-3 mr-1" />
              {slideRequirements.securityLevel} Security
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Symbol</p>
              <p className="font-semibold">{orderData.symbol}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Side</p>
              <p className={`font-semibold ${orderData.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                {orderData.side}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-semibold">{orderData.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-semibold">{orderData.orderType}</p>
            </div>
            {orderData.price && (
              <>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold">${orderData.price.toFixed(2)}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground">Est. Value</p>
              <p className="font-semibold">${orderData.estimatedValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Risk Warnings */}
          {riskWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {riskWarnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Checks */}
      {(slideRequirements.biometric || slideRequirements.locationVerification) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Security Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {slideRequirements.biometric && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Biometric Authentication</span>
                </div>
                {securityChecks.biometricCompleted ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Button size="sm" onClick={handleBiometricAuth}>
                    Authenticate
                  </Button>
                )}
              </div>
            )}

            {slideRequirements.deviceVerification && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Device Verification</span>
                </div>
                <Check className={`w-4 h-4 ${securityChecks.deviceVerified ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
            )}

            {slideRequirements.locationVerification && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Location Verification</span>
                </div>
                <Check className={`w-4 h-4 ${securityChecks.locationVerified ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slide to Execute */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Slide to Execute Order</p>
              <Progress value={slideProgress * 100} className="h-2" />
            </div>

            <div 
              ref={constraintsRef}
              className="relative w-full h-16 bg-gray-100 rounded-full overflow-hidden"
            >
              {/* Background track */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300" />
              
              {/* Progress indicator */}
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-600"
                style={{ width: `${slideProgress * 100}%` }}
              />

              {/* Slide button */}
              <motion.div
                ref={slideRef}
                className={`absolute top-1 left-1 w-14 h-14 bg-white rounded-full shadow-lg border-2 cursor-grab active:cursor-grabbing flex items-center justify-center ${
                  !allSecurityChecksPassed() || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ x }}
                drag={allSecurityChecksPassed() && !isLoading ? "x" : false}
                dragConstraints={{ left: 0, right: 300 }}
                dragElastic={0.1}
                onDragStart={handleSlideStart}
                onDrag={handleSlide}
                onDragEnd={handleSlideEnd}
                whileDrag={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <motion.div style={{ opacity, scale }}>
                  {slideCompleted ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <ChevronRight className="w-6 h-6 text-gray-600" />
                  )}
                </motion.div>
              </motion.div>

              {/* Instructions */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.p 
                  className="text-sm font-medium text-gray-600"
                  style={{ opacity }}
                >
                  {slideCompleted ? 'Release to Execute' : 'Slide to Execute'}
                </motion.p>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Executing order...</span>
                </div>
              </div>
            )}

            {/* Security requirements not met */}
            {!allSecurityChecksPassed() && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Complete all security verifications to enable order execution.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel Order
        </Button>
      </div>
    </div>
  );
};

// Helper functions for security features
async function generateDeviceFingerprint(): Promise<string> {
  // Generate unique device fingerprint
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = {
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    canvas: canvas.toDataURL(),
    userAgent: navigator.userAgent.slice(0, 100) // Truncated for security
  };

  return btoa(JSON.stringify(fingerprint));
}

async function verifyDevice(): Promise<boolean> {
  // Simulate device verification
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
}

async function verifyLocation(): Promise<boolean> {
  // Simulate location verification
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 10000 }
      );
    } else {
      resolve(false);
    }
  });
}

async function authenticateWithBiometrics(): Promise<boolean> {
  // Simulate biometric authentication (would use WebAuthn in production)
  if ('credentials' in navigator) {
    try {
      // This would be a real WebAuthn call in production
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function getBiometricToken(): Promise<string> {
  // Generate biometric verification token
  return `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getCurrentLocation(): Promise<{lat: number, lng: number}> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }),
      reject
    );
  });
}

export default SlideToExecute;
