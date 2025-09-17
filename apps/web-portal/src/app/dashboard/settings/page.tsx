'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Button, Switch, Select, TextInput, PasswordInput, Tabs, Avatar, Badge } from '@mantine/core';
import { User, Shield, Bell, Palette, Globe, Key, Smartphone, Mail } from 'lucide-react';
import { ThemePicker } from '@/components/theme/theme-picker';

const userProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'JD',
  memberSince: 'January 2023',
  accountType: 'Premium',
  twoFactorEnabled: true,
  emailVerified: true
};

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Settings</h1>
            <p className="text-gray-400 mt-1">Manage your account preferences and security settings</p>
          </div>
        </div>

        <Tabs defaultValue="profile" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="profile" leftSection={<User className="h-4 w-4" />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<Shield className="h-4 w-4" />}>
              Security
            </Tabs.Tab>
            <Tabs.Tab value="notifications" leftSection={<Bell className="h-4 w-4" />}>
              Notifications
            </Tabs.Tab>
            <Tabs.Tab value="preferences" leftSection={<Palette className="h-4 w-4" />}>
              Preferences
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile" pt="xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Profile Information</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar size="lg" color="blue">
                      {userProfile.avatar}
                    </Avatar>
                    <div>
                      <Text size="lg" fw={600} c="white">{userProfile.name}</Text>
                      <Text size="sm" c="dimmed">{userProfile.email}</Text>
                      <Group gap="xs" mt="xs">
                        <Badge color="green" variant="light">{userProfile.accountType}</Badge>
                        <Badge color="blue" variant="light">Member since {userProfile.memberSince}</Badge>
                      </Group>
                    </div>
                  </div>

                  <TextInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    defaultValue={userProfile.name}
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <TextInput
                    label="Email Address"
                    placeholder="Enter your email"
                    defaultValue={userProfile.email}
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <TextInput
                    label="Phone Number"
                    placeholder="Enter your phone number"
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <Button color="green" mt="md">
                    Update Profile
                  </Button>
                </div>
              </Card>

              {/* Account Status */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Account Status</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <Text size="sm" c="white">Email Verification</Text>
                    <Badge color={userProfile.emailVerified ? 'green' : 'red'} variant="light">
                      {userProfile.emailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <Text size="sm" c="white">Two-Factor Authentication</Text>
                    <Badge color={userProfile.twoFactorEnabled ? 'green' : 'red'} variant="light">
                      {userProfile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <Text size="sm" c="white">Account Type</Text>
                    <Badge color="green" variant="light">{userProfile.accountType}</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <Text size="sm" c="white">Member Since</Text>
                    <Text size="sm" c="dimmed">{userProfile.memberSince}</Text>
                  </div>

                  <Button variant="outline" color="red" mt="md">
                    Delete Account
                  </Button>
                </div>
              </Card>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="security" pt="xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Password Settings */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Change Password</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter current password"
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <PasswordInput
                    label="New Password"
                    placeholder="Enter new password"
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <Button color="green" mt="md">
                    Update Password
                  </Button>
                </div>
              </Card>

              {/* Two-Factor Authentication */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Two-Factor Authentication</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text size="sm" fw={500} c="white">Enable 2FA</Text>
                      <Text size="xs" c="dimmed">Add an extra layer of security to your account</Text>
                    </div>
                    <Switch
                      defaultChecked={userProfile.twoFactorEnabled}
                      color="green"
                    />
                  </div>

                  <div className="p-4 border border-gray-700 rounded">
                    <Group gap="sm" mb="sm">
                      <Smartphone className="h-5 w-5 text-green-400" />
                      <Text size="sm" fw={500} c="white">Authenticator App</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb="sm">
                      Use an authenticator app to generate verification codes
                    </Text>
                    <Button variant="outline" size="xs" color="green">
                      Setup Authenticator
                    </Button>
                  </div>

                  <div className="p-4 border border-gray-700 rounded">
                    <Group gap="sm" mb="sm">
                      <Mail className="h-5 w-5 text-blue-400" />
                      <Text size="sm" fw={500} c="white">Email Verification</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb="sm">
                      Receive verification codes via email
                    </Text>
                    <Button variant="outline" size="xs" color="blue">
                      Setup Email 2FA
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="notifications" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Notification Preferences</Text>
              </Card.Section>

              <div className="mt-4 space-y-6">
                <div>
                  <Text size="lg" fw={500} c="white" mb="md">Email Notifications</Text>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Price Alerts</Text>
                        <Text size="xs" c="dimmed">Get notified when stocks hit your target prices</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Market News</Text>
                        <Text size="xs" c="dimmed">Receive daily market summary and news</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Portfolio Updates</Text>
                        <Text size="xs" c="dimmed">Weekly portfolio performance reports</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>
                  </div>
                </div>

                <div>
                  <Text size="lg" fw={500} c="white" mb="md">Push Notifications</Text>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Trade Confirmations</Text>
                        <Text size="xs" c="dimmed">Instant notifications for completed trades</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Market Alerts</Text>
                        <Text size="xs" c="dimmed">Real-time market movement alerts</Text>
                      </div>
                      <Switch color="green" />
                    </div>
                  </div>
                </div>

                <Button color="green" mt="md">
                  Save Preferences
                </Button>
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="preferences" pt="xl">
            <div className="space-y-8">
              {/* Theme Picker */}
              <ThemePicker />

              {/* Additional Preferences */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Language & Currency Settings */}
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg" c="white">Language & Currency</Text>
                  </Card.Section>

                  <div className="mt-4 space-y-4">
                    <Select
                      label="Language"
                      placeholder="Select language"
                      data={[
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Spanish' },
                        { value: 'fr', label: 'French' },
                        { value: 'de', label: 'German' }
                      ]}
                      defaultValue="en"
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' },
                        label: { color: 'white' }
                      }}
                    />

                    <Select
                      label="Currency"
                      placeholder="Select currency"
                      data={[
                        { value: 'usd', label: 'USD ($)' },
                        { value: 'eur', label: 'EUR (€)' },
                        { value: 'gbp', label: 'GBP (£)' },
                        { value: 'jpy', label: 'JPY (¥)' }
                      ]}
                      defaultValue="usd"
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' },
                        label: { color: 'white' }
                      }}
                    />
                  </div>
                </Card>

                {/* Trading Preferences */}
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg" c="white">Trading Preferences</Text>
                  </Card.Section>

                  <div className="mt-4 space-y-4">
                    <Select
                      label="Default Order Type"
                      placeholder="Select order type"
                      data={[
                        { value: 'market', label: 'Market Order' },
                        { value: 'limit', label: 'Limit Order' },
                        { value: 'stop', label: 'Stop Order' }
                      ]}
                      defaultValue="market"
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' },
                        label: { color: 'white' }
                      }}
                    />

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Confirm Orders</Text>
                        <Text size="xs" c="dimmed">Show confirmation dialog for trades</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Auto-refresh Data</Text>
                        <Text size="xs" c="dimmed">Automatically refresh market data</Text>
                      </div>
                      <Switch defaultChecked color="green" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="sm" fw={500} c="white">Compact Mode</Text>
                        <Text size="xs" c="dimmed">Show more data in less space</Text>
                      </div>
                      <Switch color="green" />
                    </div>

                    <Button color="green" mt="md">
                      Save Preferences
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}