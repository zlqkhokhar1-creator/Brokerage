"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileText, CheckCircle, AlertTriangle, Clock, Upload, Download } from 'lucide-react';

interface ComplianceStatus {
  overall: number;
  kyc: {
    status: 'pending' | 'approved' | 'rejected' | 'incomplete';
    completedSteps: number;
    totalSteps: number;
    lastUpdated: string;
  };
  aml: {
    status: 'compliant' | 'review' | 'flagged';
    riskScore: number;
    lastCheck: string;
  };
  suitability: {
    status: 'assessed' | 'pending' | 'expired';
    profile: string;
    expiryDate: string;
  };
  disclosures: {
    acknowledged: number;
    pending: number;
    documents: any[];
  };
}

interface Document {
  id: string;
  name: string;
  type: 'identity' | 'address' | 'income' | 'employment' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  uploadDate: string;
  size: string;
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  category: 'kyc' | 'trading' | 'risk' | 'system';
}

export default function CompliancePage() {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>({
    overall: 85,
    kyc: {
      status: 'approved',
      completedSteps: 4,
      totalSteps: 5,
      lastUpdated: '2024-09-01T10:00:00Z'
    },
    aml: {
      status: 'compliant',
      riskScore: 15,
      lastCheck: '2024-09-06T08:00:00Z'
    },
    suitability: {
      status: 'assessed',
      profile: 'Moderate Investor',
      expiryDate: '2025-09-01T00:00:00Z'
    },
    disclosures: {
      acknowledged: 8,
      pending: 2,
      documents: []
    }
  });

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Passport Copy',
      type: 'identity',
      status: 'approved',
      uploadDate: '2024-08-15T10:00:00Z',
      size: '2.1 MB'
    },
    {
      id: '2',
      name: 'Utility Bill',
      type: 'address',
      status: 'approved',
      uploadDate: '2024-08-16T14:30:00Z',
      size: '1.8 MB'
    },
    {
      id: '3',
      name: 'Employment Letter',
      type: 'employment',
      status: 'pending',
      uploadDate: '2024-09-05T09:15:00Z',
      size: '0.9 MB'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      action: 'KYC Status Updated',
      timestamp: '2024-09-06T10:30:00Z',
      details: 'KYC verification completed successfully',
      category: 'kyc'
    },
    {
      id: '2',
      action: 'Risk Assessment',
      timestamp: '2024-09-06T08:00:00Z',
      details: 'AML risk score updated to Low (15/100)',
      category: 'risk'
    },
    {
      id: '3',
      action: 'Document Upload',
      timestamp: '2024-09-05T09:15:00Z',
      details: 'Employment verification document uploaded',
      category: 'kyc'
    },
    {
      id: '4',
      action: 'Trade Executed',
      timestamp: '2024-09-04T14:20:00Z',
      details: 'Large order flagged for compliance review',
      category: 'trading'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'compliant':
      case 'assessed':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
      case 'review':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'rejected':
      case 'flagged':
      case 'expired':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'compliant':
      case 'assessed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'review':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
      case 'flagged':
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-400';
    if (score <= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const uploadDocument = (file: File) => {
    // Mock document upload
    const newDoc: Document = {
      id: Date.now().toString(),
      name: file.name,
      type: 'other',
      status: 'pending',
      uploadDate: new Date().toISOString(),
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`
    };
    setDocuments(prev => [newDoc, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Compliance Dashboard</h1>
              <p className="text-gray-400">Monitor your regulatory compliance status</p>
            </div>
            <Badge className={getStatusColor(complianceStatus.kyc.status)}>
              <Shield className="w-4 h-4 mr-1" />
              {complianceStatus.overall}% Compliant
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">KYC Status</p>
                  <p className="text-lg font-bold">{complianceStatus.kyc.status.toUpperCase()}</p>
                </div>
                {getStatusIcon(complianceStatus.kyc.status)}
              </div>
              <Progress value={(complianceStatus.kyc.completedSteps / complianceStatus.kyc.totalSteps) * 100} className="mb-2" />
              <p className="text-xs text-gray-500">
                {complianceStatus.kyc.completedSteps}/{complianceStatus.kyc.totalSteps} steps completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">AML Status</p>
                  <p className="text-lg font-bold">{complianceStatus.aml.status.toUpperCase()}</p>
                </div>
                {getStatusIcon(complianceStatus.aml.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Risk Score</span>
                <span className={`text-sm font-bold ${getRiskScoreColor(complianceStatus.aml.riskScore)}`}>
                  {complianceStatus.aml.riskScore}/100
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">Suitability</p>
                  <p className="text-lg font-bold">{complianceStatus.suitability.status.toUpperCase()}</p>
                </div>
                {getStatusIcon(complianceStatus.suitability.status)}
              </div>
              <p className="text-xs text-gray-500">
                Profile: {complianceStatus.suitability.profile}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">Disclosures</p>
                  <p className="text-lg font-bold">{complianceStatus.disclosures.acknowledged} / {complianceStatus.disclosures.acknowledged + complianceStatus.disclosures.pending}</p>
                </div>
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs text-gray-500">
                {complianceStatus.disclosures.pending} pending acknowledgment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed View */}
        <Tabs defaultValue="kyc" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
            <TabsTrigger value="aml">AML Monitoring</TabsTrigger>
            <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>KYC Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-blue-400" />
                        <div>
                          <div className="font-semibold">{doc.name}</div>
                          <div className="text-sm text-gray-400 capitalize">{doc.type} • {doc.size}</div>
                          <div className="text-xs text-gray-500">Uploaded: {formatDate(doc.uploadDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                          {doc.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 border-2 border-dashed border-[#1E1E1E] rounded-lg text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">Upload additional documents</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(uploadDocument);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Choose Files
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aml" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>AML Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Overall Risk Score</span>
                      <span className={`font-bold ${getRiskScoreColor(complianceStatus.aml.riskScore)}`}>
                        {complianceStatus.aml.riskScore}/100
                      </span>
                    </div>
                    <Progress value={complianceStatus.aml.riskScore} className="mb-4" />
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Transaction Patterns</span>
                        <span className="text-green-400">Normal</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Geographic Risk</span>
                        <span className="text-green-400">Low</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>PEP Status</span>
                        <span className="text-green-400">Clear</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Sanctions Check</span>
                        <span className="text-green-400">Clear</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                      <p className="text-sm text-green-400">
                        ✓ Last AML check: {formatDateTime(complianceStatus.aml.lastCheck)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Monitoring Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Large Transaction Alert</span>
                        <Badge className="text-yellow-400 bg-yellow-400/10">Review</Badge>
                      </div>
                      <p className="text-sm text-gray-400">Transaction of $25,000 flagged for review</p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                    
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Pattern Analysis</span>
                        <Badge className="text-green-400 bg-green-400/10">Clear</Badge>
                      </div>
                      <p className="text-sm text-gray-400">Monthly transaction pattern analysis completed</p>
                      <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="disclosures" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Required Disclosures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: 'Risk Disclosure Statement', status: 'acknowledged', date: '2024-08-01' },
                    { title: 'Privacy Policy', status: 'acknowledged', date: '2024-08-01' },
                    { title: 'Terms of Service', status: 'acknowledged', date: '2024-08-01' },
                    { title: 'Options Trading Agreement', status: 'pending', date: null },
                    { title: 'Margin Agreement', status: 'pending', date: null }
                  ].map((disclosure, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div>
                        <div className="font-semibold">{disclosure.title}</div>
                        {disclosure.date && (
                          <div className="text-sm text-gray-400">Acknowledged: {formatDate(disclosure.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(disclosure.status)}>
                          {getStatusIcon(disclosure.status)}
                          {disclosure.status}
                        </Badge>
                        {disclosure.status === 'pending' ? (
                          <Button size="sm">Acknowledge</Button>
                        ) : (
                          <Button size="sm" variant="outline">View</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {log.category.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{log.action}</div>
                        <div className="text-sm text-gray-400 mt-1">{log.details}</div>
                        <div className="text-xs text-gray-500 mt-2">{formatDateTime(log.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
