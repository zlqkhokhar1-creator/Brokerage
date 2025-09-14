"use client";

import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account Onboarding</h1>
          <p className="text-muted-foreground">We’ll set up your profile and verify your identity.</p>
        </div>

        <Progress value={(step / 3) * 100} aria-label="Onboarding progress" />

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Tell us about yourself.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Doe" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="jane@example.com" autoComplete="email" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Details</CardTitle>
              <CardDescription>Provide government ID details for verification.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cnic">CNIC/Passport</Label>
                <Input id="cnic" placeholder="12345-1234567-1" />
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Risk Profile</CardTitle>
              <CardDescription>Help us tailor your experience.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="horizon">Investment horizon</Label>
                <Input id="horizon" placeholder="e.g., 3–5 years" />
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <Button>Finish</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}


