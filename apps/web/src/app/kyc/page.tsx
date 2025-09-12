"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Camera,
  Trash2,
  Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface KYCStatus {
  status: string;
  documents: any;
  submittedAt: string;
  lastUpdated: string;
}

interface DocumentUpload {
  file: File;
  preview: string;
  type: string;
}

export default function KYCPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [kycStatus, setKycStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      dateOfBirth: '',
      nationality: ''
    },
    addressInfo: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    employmentInfo: {
      employer: '',
      jobTitle: '',
      employmentStatus: ''
    },
    financialInfo: {
      annualIncome: '',
      netWorth: '',
      sourceOfFunds: ''
    },
    riskAssessment: {
  riskProfile: 'moderate',
  investmentGoals: []
    }
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1/kyc")
      .then((res) => res.json())
      .then((data) => setKycStatus(data.status || "pending"))
      .catch(() => toast({ title: "Error", description: "Failed to load KYC status", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#232526] via-[#414345] to-[#ff512f] flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-4xl mx-auto text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2 animate-fade-in">KYC Verification</h1>
        <p className="text-lg md:text-xl text-[#ff512f] font-medium mb-6 animate-fade-in-delay">Verify your identity securely and quickly.</p>
      </header>
      <main className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Status</h3>
          <p className="text-white/80">{kycStatus}</p>
        </div>
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Upload Documents</h3>
          <p className="text-white/80">Passport, ID, Proof of Address</p>
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center py-8 mt-16 text-white/70 animate-fade-in-delay">
        &copy; {new Date().getFullYear()} InvestPro. All rights reserved.
      </footer>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-delay { animation: fade-in 1.5s ease-out; }
      `}</style>
    </div>
  );
}


