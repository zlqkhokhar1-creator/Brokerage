'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, FileType, FileArchive, FileSpreadsheet, FileBarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type DocumentType = 'portfolio' | 'tax' | 'performance' | 'compliance' | 'custom';

type Document = {
  id: string;
  title: string;
  type: DocumentType;
  status: 'generating' | 'ready' | 'error';
  progress?: number;
  size: string;
  format: 'PDF' | 'CSV' | 'XLSX' | 'DOCX';
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  description?: string;
};

type TaxDocument = {
  id: string;
  year: number;
  type: '1099' | 'W-2' | '1040' | 'K-1' | 'Other';
  status: 'ready' | 'pending' | 'needs_review' | 'filed';
  dueDate: Date;
  filedDate?: Date;
  amount?: number;
  description: string;
};

const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'portfolio':
      return <FileBarChart2 className="h-5 w-5" />;
    case 'tax':
      return <FileSpreadsheet className="h-5 w-5" />;
    case 'performance':
      return <FileBarChart2 className="h-5 w-5" />;
    case 'compliance':
      return <FileText className="h-5 w-5" />;
    default:
      return <FileType className="h-5 w-5" />;
  }
};

const getFormatIcon = (format: string) => {
  switch (format) {
    case 'PDF':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'CSV':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'XLSX':
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    case 'DOCX':
      return <FileType className="h-4 w-4 text-blue-500" />;
    default:
      return <FileType className="h-4 w-4" />;
  }
};

export function AIDocumentation() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for reports
        const mockDocuments: Document[] = [
          {
            id: '1',
            title: 'Q3 2023 Portfolio Performance',
            type: 'portfolio',
            status: 'ready',
            size: '2.4 MB',
            format: 'PDF',
            createdAt: new Date(2023, 9, 15),
            updatedAt: new Date(2023, 9, 15),
            tags: ['Quarterly', 'Performance'],
            description: 'Comprehensive analysis of your portfolio performance for Q3 2023'
          },
          {
            id: '2',
            title: '2023 Tax Preparation Package',
            type: 'tax',
            status: 'generating',
            progress: 65,
            size: '1.8 MB',
            format: 'PDF',
            createdAt: new Date(2023, 11, 1),
            tags: ['Annual', 'Tax'],
            description: 'Complete tax documents for 2023 filing'
          },
          {
            id: '3',
            title: 'Asset Allocation Report',
            type: 'performance',
            status: 'ready',
            size: '1.2 MB',
            format: 'XLSX',
            createdAt: new Date(2023, 10, 1),
            updatedAt: new Date(2023, 10, 1),
            tags: ['Analysis'],
            description: 'Detailed breakdown of your current asset allocation'
          },
          {
            id: '4',
            title: 'Compliance Report - October 2023',
            type: 'compliance',
            status: 'ready',
            size: '890 KB',
            format: 'PDF',
            createdAt: new Date(2023, 9, 5),
            updatedAt: new Date(2023, 9, 5),
            tags: ['Monthly', 'Compliance'],
            description: 'Regulatory compliance report for October 2023'
          }
        ];

        // Mock data for tax documents
        const mockTaxDocuments: TaxDocument[] = [
          {
            id: 't1',
            year: currentYear,
            type: '1099',
            status: 'ready',
            dueDate: new Date(currentYear, 1, 15),
            filedDate: new Date(currentYear, 1, 10),
            amount: 12500,
            description: 'Consolidated 1099 for tax year 2023'
          },
          {
            id: 't2',
            year: currentYear,
            type: '1040',
            status: 'pending',
            dueDate: new Date(currentYear, 3, 15),
            description: 'Individual Income Tax Return 2023'
          },
          {
            id: 't3',
            year: currentYear - 1,
            type: '1099',
            status: 'filed',
            dueDate: new Date(currentYear - 1, 1, 15),
            filedDate: new Date(currentYear - 1, 1, 5),
            amount: 9800,
            description: 'Consolidated 1099 for tax year 2022'
          },
          {
            id: 't4',
            year: currentYear,
            type: 'K-1',
            status: 'needs_review',
            dueDate: new Date(currentYear, 2, 15),
            description: 'Partnership K-1 for 2023'
          }
        ];

        setDocuments(mockDocuments);
        setTaxDocuments(mockTaxDocuments);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [currentYear]);

  const generateReport = async (type: DocumentType) => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call your API to generate the report
      const newReport: Document = {
        id: `doc-${Date.now()}`,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        type,
        status: 'ready',
        size: '1.5 MB',
        format: 'PDF',
        createdAt: new Date(),
        description: `Automatically generated ${type} report`
      };

      setDocuments(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ready: { label: 'Ready', className: 'bg-green-100 text-green-800' },
      generating: { label: 'Generating', className: 'bg-blue-100 text-blue-800' },
      error: { label: 'Error', className: 'bg-red-100 text-red-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      needs_review: { label: 'Needs Review', className: 'bg-orange-100 text-orange-800' },
      filed: { label: 'Filed', className: 'bg-purple-100 text-purple-800' }
    } as const;

    const { label, className } = statusMap[status as keyof typeof statusMap] || 
      { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>AI-Powered Documentation</CardTitle>
            <CardDescription>
              Automatically generated reports and tax documents
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateReport('portfolio')}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'New Report'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="tax">Tax Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Loading documents...</p>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">No documents found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate a new report to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mr-4 text-muted-foreground">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        {getStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(doc.createdAt, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          {getFormatIcon(doc.format)}
                          <span className="ml-1">{doc.format} • {doc.size}</span>
                        </div>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {doc.status === 'generating' && doc.progress !== undefined ? (
                      <div className="w-32 ml-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Generating</span>
                          <span>{doc.progress}%</span>
                        </div>
                        <Progress value={doc.progress} className="h-2" />
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="ml-2">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Loading tax documents...</p>
                </div>
              </div>
            ) : taxDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">No tax documents found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your tax documents will appear here when available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {taxDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{doc.year} {doc.type}</h3>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            Due: {format(doc.dueDate, 'MMM d, yyyy')}
                          </div>
                          {doc.filedDate && (
                            <div className="flex items-center text-muted-foreground">
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Filed: {format(doc.filedDate, 'MMM d, yyyy')}
                            </div>
                          )}
                          {doc.amount !== undefined && (
                            <div className="text-muted-foreground">
                              ${doc.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {doc.status === 'needs_review' && (
                          <Button size="sm">
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="text-xs text-muted-foreground">
          Documents are stored securely and can be accessed anytime. Tax documents are typically available by January 31st each year.
        </div>
      </CardFooter>
    </Card>
  );
}
