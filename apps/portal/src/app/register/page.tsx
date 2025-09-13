"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Eye, EyeOff, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  riskProfile: string;
  investmentGoals: string[];
}

const countries = [
  { code: "USA", name: "United States" },
  { code: "CAN", name: "Canada" },
  { code: "GBR", name: "United Kingdom" },
  { code: "AUS", name: "Australia" },
  { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" },
  { code: "JPN", name: "Japan" },
  { code: "SGP", name: "Singapore" },
  { code: "UAE", name: "United Arab Emirates" },
];

const investmentGoalsOptions = [
  "Retirement Planning",
  "Wealth Building",
  "Education Funding",
  "Home Purchase",
  "Emergency Fund",
  "Passive Income",
  "Tax Optimization",
  "Estate Planning",
];

export default function Register() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    riskProfile: "moderate",
    investmentGoals: [],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const { register } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (field === "investmentGoals") {
      setFormData(prev => ({
        ...prev,
        investmentGoals: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.dateOfBirth || !formData.nationality) {
      setError("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!formData.address.line1 || !formData.address.city || !formData.address.country) {
      setError("Please fill in all required address fields");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    let isValid = false;

    switch (step) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError("");
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      await register(formData);
      toast({
        title: "Welcome to InvestPro!",
        description: "Your account has been created successfully.",
      });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      toast({
        title: "Registration failed",
        description: err.message || "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInvestmentGoal = (goal: string) => {
    const currentGoals = formData.investmentGoals;
    const updatedGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    handleInputChange("investmentGoals", updatedGoals);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#f7ff00] flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-md mx-auto text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2 animate-fade-in">Register</h1>
        <p className="text-lg md:text-xl text-[#f7ff00] font-medium mb-6 animate-fade-in-delay">Create your InvestPro account.</p>
      </header>
      <main className="w-full max-w-md mx-auto bg-white/20 backdrop-blur-lg rounded-xl p-8 shadow-xl border border-white/30 animate-fade-in-delay">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Join thousands of investors on InvestPro
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                {stepNumber < step ? <CheckCircle className="w-4 h-4" /> : stepNumber}
              </div>
              {stepNumber < 5 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    stepNumber < step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Account Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                  className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Create a strong password"
                    required
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter your first name"
                    required
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
                    required
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter your phone number"
                  required
                  disabled={isLoading}
                  className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Identity Verification */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(value) => handleInputChange("nationality", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Address Information */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  value={formData.address.line1}
                  onChange={(e) => handleInputChange("address.line1", e.target.value)}
                  placeholder="Street address"
                  required
                  disabled={isLoading}
                  className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.address.line2}
                  onChange={(e) => handleInputChange("address.line2", e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                  disabled={isLoading}
                  className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange("address.city", e.target.value)}
                    placeholder="Enter your city"
                    required
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange("address.state", e.target.value)}
                    placeholder="Enter your state"
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) => handleInputChange("address.postalCode", e.target.value)}
                    placeholder="Enter postal code"
                    disabled={isLoading}
                    className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={formData.address.country}
                    onValueChange={(value) => handleInputChange("address.country", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Investment Preferences */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Risk Profile *</Label>
                <Select
                  value={formData.riskProfile}
                  onValueChange={(value) => handleInputChange("riskProfile", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your risk tolerance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Investment Goals (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {investmentGoalsOptions.map((goal) => (
                    <div
                      key={goal}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.investmentGoals.includes(goal)
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                      onClick={() => toggleInvestmentGoal(goal)}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            formData.investmentGoals.includes(goal)
                              ? "border-primary bg-primary"
                              : "border-slate-300"
                          }`}
                        >
                          {formData.investmentGoals.includes(goal) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm">{goal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
            >
              Back
            </Button>

            {step < 5 ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <footer className="w-full max-w-md mx-auto text-center py-8 mt-16 text-white/70 animate-fade-in-delay">
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