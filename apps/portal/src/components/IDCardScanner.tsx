import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  RotateCcw,
  Crop,
  Eye,
  FileText,
  Scan,
  RefreshCw,
  CreditCard
} from 'lucide-react';

interface ExtractedIDData {
  documentType: 'CNIC' | 'PASSPORT' | 'DRIVING_LICENSE';
  documentNumber: string;
  name: string;
  fatherName?: string;
  dateOfBirth: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  address?: string;
  gender?: string;
  nationality?: string;
  placeOfBirth?: string;
  confidence: number;
  rawText: string;
}

interface IDCardScannerProps {
  onDataExtracted: (data: ExtractedIDData) => void;
  onSkip?: () => void;
  acceptedDocuments?: ('CNIC' | 'PASSPORT' | 'DRIVING_LICENSE')[];
  isRequired?: boolean;
}

const IDCardScanner: React.FC<IDCardScannerProps> = ({
  onDataExtracted,
  onSkip,
  acceptedDocuments = ['CNIC', 'PASSPORT', 'DRIVING_LICENSE'],
  isRequired = true
}) => {
  const [step, setStep] = useState<'selection' | 'camera' | 'upload' | 'processing' | 'review' | 'complete'>('selection');
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'upload'>('camera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedIDData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStep('camera');
    } catch (error) {
      setError('Camera access denied. Please use file upload instead.');
      setCaptureMethod('upload');
      setStep('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
    processImage(imageData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError('');
    setStep('processing');

    try {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'id-card.jpg');
      formData.append('documentTypes', JSON.stringify(acceptedDocuments));

      const ocrResponse = await fetch('/api/v1/ocr/extract-id', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!ocrResponse.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await ocrResponse.json();
      
      if (result.success && result.data) {
        const extractedData: ExtractedIDData = {
          documentType: result.data.documentType,
          documentNumber: result.data.documentNumber,
          name: result.data.name,
          fatherName: result.data.fatherName,
          dateOfBirth: result.data.dateOfBirth,
          dateOfIssue: result.data.dateOfIssue,
          dateOfExpiry: result.data.dateOfExpiry,
          address: result.data.address,
          gender: result.data.gender,
          nationality: result.data.nationality,
          placeOfBirth: result.data.placeOfBirth,
          confidence: result.data.confidence,
          rawText: result.data.rawText
        };
        
        setExtractedData(extractedData);
        setStep('review');
      } else {
        throw new Error(result.message || 'Failed to extract data from ID card');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Processing failed');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      setStep('complete');
    }
  };

  const retryCapture = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setError('');
    setStep('selection');
  };

  const renderSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">ID Card Verification</h2>
        <p className="text-muted-foreground">
          Scan your ID card to verify your identity
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Accepted Documents</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {acceptedDocuments.map(doc => (
              <Badge key={doc} variant="secondary">
                {doc.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${captureMethod === 'camera' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setCaptureMethod('camera')}
          >
            <CardContent className="p-6 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Camera Capture</h3>
              <p className="text-sm text-muted-foreground">
                Take a photo of your ID card
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${captureMethod === 'upload' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setCaptureMethod('upload')}
          >
            <CardContent className="p-6 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">File Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload an existing photo
              </p>
            </CardContent>
          </Card>
        </div>

        <Button 
          onClick={captureMethod === 'camera' ? startCamera : () => setStep('upload')}
          className="w-full"
        >
          Continue with {captureMethod === 'camera' ? 'Camera' : 'Upload'}
        </Button>

        {!isRequired && onSkip && (
          <Button variant="outline" onClick={onSkip} className="w-full">
            Skip for Now
          </Button>
        )}
      </div>
    </div>
  );

  const renderCamera = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Position Your ID Card</h2>
        <p className="text-muted-foreground">
          Align your ID card within the frame
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              style={{ maxHeight: '400px' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay guide */}
            <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
              <div className="text-white text-center bg-black bg-opacity-50 p-2 rounded">
                <p className="text-sm">Position ID card here</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={capturePhoto} className="flex-1">
          <Camera className="w-4 h-4 mr-2" />
          Capture Photo
        </Button>
        <Button variant="outline" onClick={() => { stopCamera(); setStep('selection'); }}>
          Cancel
        </Button>
      </div>

      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for best results:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Ensure good lighting</li>
            <li>• Keep the card flat and straight</li>
            <li>• Avoid shadows and glare</li>
            <li>• Fill the frame with your ID card</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Upload ID Card Photo</h2>
        <p className="text-muted-foreground">
          Select a clear photo of your ID card
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">Drop your image here</p>
              <p className="text-muted-foreground mb-4">or click to browse</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Select File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => setStep('selection')} className="w-full">
        Back to Options
      </Button>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Scan className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Processing ID Card</h2>
        <p className="text-muted-foreground">
          Extracting information from your document
        </p>
      </div>

      {capturedImage && (
        <Card>
          <CardContent className="p-4">
            <img 
              src={capturedImage} 
              alt="Captured ID" 
              className="w-full max-w-md mx-auto rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p>Analyzing document...</p>
            <p className="text-sm text-muted-foreground">
              This may take a few moments
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {retryCount < 3 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryCapture}
                className="ml-2"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">Review Extracted Data</h2>
        <p className="text-muted-foreground">
          Please verify the information is correct
        </p>
      </div>

      {capturedImage && (
        <Card>
          <CardContent className="p-4">
            <img 
              src={capturedImage} 
              alt="Captured ID" 
              className="w-full max-w-sm mx-auto rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Extracted Information
              <Badge variant="secondary">
                Confidence: {Math.round(extractedData.confidence)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Document Type</Label>
                <p className="font-semibold">{extractedData.documentType}</p>
              </div>
              <div>
                <Label>Document Number</Label>
                <p className="font-semibold">{extractedData.documentNumber}</p>
              </div>
              <div>
                <Label>Name</Label>
                <p className="font-semibold">{extractedData.name}</p>
              </div>
              {extractedData.fatherName && (
                <div>
                  <Label>Father's Name</Label>
                  <p className="font-semibold">{extractedData.fatherName}</p>
                </div>
              )}
              <div>
                <Label>Date of Birth</Label>
                <p className="font-semibold">{extractedData.dateOfBirth}</p>
              </div>
              {extractedData.dateOfExpiry && (
                <div>
                  <Label>Expiry Date</Label>
                  <p className="font-semibold">{extractedData.dateOfExpiry}</p>
                </div>
              )}
              {extractedData.gender && (
                <div>
                  <Label>Gender</Label>
                  <p className="font-semibold">{extractedData.gender}</p>
                </div>
              )}
              {extractedData.nationality && (
                <div>
                  <Label>Nationality</Label>
                  <p className="font-semibold">{extractedData.nationality}</p>
                </div>
              )}
            </div>
            
            {extractedData.address && (
              <div>
                <Label>Address</Label>
                <p className="font-semibold">{extractedData.address}</p>
              </div>
            )}

            {extractedData.confidence < 80 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low confidence score detected. Please verify the information is correct or retake the photo.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={confirmData} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-2" />
          Confirm Data
        </Button>
        <Button variant="outline" onClick={retryCapture}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">ID Verification Complete</h2>
        <p className="text-muted-foreground">
          Your ID card has been successfully processed
        </p>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
          <p className="font-semibold">Document Verified</p>
          <p className="text-sm text-muted-foreground">
            {extractedData?.documentType} - {extractedData?.documentNumber}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 'selection' && renderSelection()}
      {step === 'camera' && renderCamera()}
      {step === 'upload' && renderUpload()}
      {step === 'processing' && renderProcessing()}
      {step === 'review' && renderReview()}
      {step === 'complete' && renderComplete()}
    </div>
  );
};

export default IDCardScanner;
