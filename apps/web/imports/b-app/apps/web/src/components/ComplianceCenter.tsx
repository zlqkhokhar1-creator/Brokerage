import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Upload,
  User,
  Building,
  CreditCard,
  Eye,
  Download
} from 'lucide-react';

interface KYCStatus {
  personalInfo: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  addressVerification: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  identityVerification: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  financialInfo: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  overallStatus: 'INCOMPLETE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  completionPercentage: number;
}

interface ComplianceAlert {
  id: string;
  type: 'PATTERN_VIOLATION' | 'REGULATORY_CHANGE' | 'DOCUMENT_EXPIRY' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  timestamp: string;
  actionRequired: boolean;
}

interface KYCDocument {
  id: string;
  type: 'PASSPORT' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'BANK_STATEMENT' | 'TAX_DOCUMENT';
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadDate: string;
  expiryDate?: string;
}

const ComplianceCenter: React.FC = () => {
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadingFile, setUploadingFile] = useState(false);

  // KYC Form States
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    ssn: '',
    phoneNumber: '',
    email: ''
  });

  const [addressInfo, setAddressInfo] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });

  const [financialInfo, setFinancialInfo] = useState({
    employmentStatus: '',
    employer: '',
    annualIncome: '',
    netWorth: '',
    investmentExperience: '',
    riskTolerance: ''
  });

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      
      // Fetch KYC status
      const kycResponse = await fetch('/api/v1/compliance/kyc/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (kycResponse.ok) {
        const kycData = await kycResponse.json();
        setKycStatus(kycData.data);
      }

      // Fetch compliance alerts
      const alertsResponse = await fetch('/api/v1/compliance/alerts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setComplianceAlerts(alertsData.data || []);
      }

      // Fetch documents
      const docsResponse = await fetch('/api/v1/compliance/documents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitKYCSection = async (section: string, data: any) => {
    try {
      const response = await fetch('/api/v1/compliance/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ section, data })
      });

      if (response.ok) {
        await fetchComplianceData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting KYC:', error);
      return false;
    }
  };

  const uploadDocument = async (file: File, documentType: string) => {
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);

      const response = await fetch('/api/v1/compliance/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        await fetchComplianceData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error uploading document:', error);
      return false;
    } finally {
      setUploadingFile(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200';
      case 'PENDING': 
      case 'SUBMITTED': 
      case 'PENDING_REVIEW': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': 
      case 'SUBMITTED': 
      case 'PENDING_REVIEW': return <Clock className="w-4 h-4" />;
      case 'REJECTED': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Center</h1>
          <p className="text-muted-foreground">Manage your KYC status and compliance requirements</p>
        </div>
        <div className="flex items-center gap-2">
          {kycStatus && (
            <Badge className={getStatusColor(kycStatus.overallStatus)}>
              {getStatusIcon(kycStatus.overallStatus)}
              <span className="ml-1">{kycStatus.overallStatus.replace('_', ' ')}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* KYC Progress Overview */}
      {kycStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              KYC Completion Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{kycStatus.completionPercentage}%</span>
                </div>
                <Progress value={kycStatus.completionPercentage} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge className={getStatusColor(kycStatus.personalInfo)} variant="outline">
                    <User className="w-3 h-3 mr-1" />
                    Personal Info
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(kycStatus.addressVerification)} variant="outline">
                    <Building className="w-3 h-3 mr-1" />
                    Address
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(kycStatus.identityVerification)} variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    Identity
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(kycStatus.financialInfo)} variant="outline">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Financial
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceAlerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="text-sm">{alert.description}</p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc-form">KYC Form</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kycStatus?.personalInfo === 'PENDING' && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <User className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-semibold">Complete Personal Information</p>
                      <p className="text-sm text-muted-foreground">Provide basic personal details</p>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('kyc-form')}>
                      Start
                    </Button>
                  </div>
                )}
                
                {kycStatus?.identityVerification === 'PENDING' && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-semibold">Upload Identity Documents</p>
                      <p className="text-sm text-muted-foreground">Passport or driver's license required</p>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('documents')}>
                      Upload
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Documents Uploaded</span>
                  <span className="font-semibold">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved Documents</span>
                  <span className="font-semibold text-green-600">
                    {documents.filter(doc => doc.status === 'APPROVED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Review</span>
                  <span className="font-semibold text-yellow-600">
                    {documents.filter(doc => doc.status === 'PENDING').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Alerts</span>
                  <span className="font-semibold text-red-600">
                    {complianceAlerts.filter(alert => alert.actionRequired).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kyc-form" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo({...personalInfo, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo({...personalInfo, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => setPersonalInfo({...personalInfo, dateOfBirth: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="ssn">Social Security Number</Label>
                  <Input
                    id="ssn"
                    value={personalInfo.ssn}
                    onChange={(e) => setPersonalInfo({...personalInfo, ssn: e.target.value})}
                    placeholder="XXX-XX-XXXX"
                  />
                </div>
                
                <Button 
                  onClick={() => submitKYCSection('personal', personalInfo)}
                  className="w-full"
                >
                  Save Personal Information
                </Button>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={addressInfo.street}
                    onChange={(e) => setAddressInfo({...addressInfo, street: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={addressInfo.city}
                      onChange={(e) => setAddressInfo({...addressInfo, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={addressInfo.state}
                      onChange={(e) => setAddressInfo({...addressInfo, state: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={addressInfo.zipCode}
                      onChange={(e) => setAddressInfo({...addressInfo, zipCode: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={addressInfo.country}
                      onChange={(e) => setAddressInfo({...addressInfo, country: e.target.value})}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => submitKYCSection('address', addressInfo)}
                  className="w-full"
                >
                  Save Address Information
                </Button>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employmentStatus">Employment Status</Label>
                    <Input
                      id="employmentStatus"
                      value={financialInfo.employmentStatus}
                      onChange={(e) => setFinancialInfo({...financialInfo, employmentStatus: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annualIncome">Annual Income</Label>
                    <Input
                      id="annualIncome"
                      value={financialInfo.annualIncome}
                      onChange={(e) => setFinancialInfo({...financialInfo, annualIncome: e.target.value})}
                      placeholder="$50,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="netWorth">Net Worth</Label>
                    <Input
                      id="netWorth"
                      value={financialInfo.netWorth}
                      onChange={(e) => setFinancialInfo({...financialInfo, netWorth: e.target.value})}
                      placeholder="$100,000"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => submitKYCSection('financial', financialInfo)}
                  className="w-full"
                >
                  Save Financial Information
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['PASSPORT', 'DRIVERS_LICENSE', 'UTILITY_BILL', 'BANK_STATEMENT'].map((docType) => (
                  <div key={docType} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{docType.replace('_', ' ')}</h4>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadDocument(file, docType);
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents.find(doc => doc.type === docType) && (
                        <Badge className={getStatusColor(documents.find(doc => doc.type === docType)?.status || '')}>
                          {documents.find(doc => doc.type === docType)?.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(doc.status)}>
                        {getStatusIcon(doc.status)}
                        <span className="ml-1">{doc.status}</span>
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Compliance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="font-semibold">{alert.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{alert.description}</p>
                    {alert.actionRequired && (
                      <Button size="sm">Take Action</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceCenter;
