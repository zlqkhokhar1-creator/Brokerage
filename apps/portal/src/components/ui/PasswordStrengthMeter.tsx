import * as React from 'react'

interface PasswordStrengthMeterProps {
  password: string
}

function getStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z\d]/.test(password)) score += 1
  return score
}

const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password)
  const label = strengthLabels[strength] || 'Weak'
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-orange-500', 'bg-blue-500', 'bg-green-500']
  const color = colors[strength] || 'bg-red-500'
  const width = `${(strength / 5) * 100}%`

  if (!password) return null

  return (
    <div className="mt-1">
      <div className="flex items-center space-x-2">
        <div className="h-2 w-full bg-gray-200 rounded-full">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${color}`} 
            style={{ width }}
          />
        </div>
        <span className="text-sm text-gray-600 capitalize">{label}</span>
      </div>
    </div>
  )
}