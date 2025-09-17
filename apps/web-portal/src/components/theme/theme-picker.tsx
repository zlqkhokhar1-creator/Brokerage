'use client';

import { Card, Text, Badge, SimpleGrid } from '@mantine/core';
import { Check, Palette, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/lib/stores/theme-store';
import { motion } from 'framer-motion';

export function ThemePicker() {
  const { currentTheme, availableThemes, setTheme } = useThemeStore();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Palette className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-heading-2 mb-3">Choose Your Theme</h2>
        <p className="text-body text-secondary max-w-md mx-auto">
          Customize your Invest Pro experience with beautiful color schemes. Each theme is carefully crafted for optimal readability and professional appearance.
        </p>
      </motion.div>

      {/* Theme Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {availableThemes.map((theme, index) => (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card
                className={`card-clean cursor-pointer transition-all duration-300 hover:shadow-soft ${
                  currentTheme.id === theme.id
                    ? 'ring-2 ring-primary-500 shadow-soft bg-primary-50/50'
                    : 'hover:shadow-soft hover:scale-[1.02]'
                }`}
                onClick={() => setTheme(theme.id)}
              >
                {/* Theme Preview Colors */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.preview.primary }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.preview.secondary }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.preview.accent }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  {/* Active Badge */}
                  {currentTheme.id === theme.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, type: "spring" }}
                    >
                      <Badge
                        color="green"
                        variant="filled"
                        size="sm"
                        leftSection={<Check size={12} />}
                        className="bg-success-500"
                      >
                        Active
                      </Badge>
                    </motion.div>
                  )}
                </div>

                {/* Theme Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-primary text-lg">{theme.name}</h3>
                    <p className="text-sm text-secondary mt-1">{theme.description}</p>
                  </div>

                  {/* Theme Features */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="light" size="xs" color="blue">Professional</Badge>
                    <Badge variant="light" size="xs" color="green">Accessible</Badge>
                    <Badge variant="light" size="xs" color="purple">Modern</Badge>
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  className={`w-full mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    currentTheme.id === theme.id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-md'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Palette size={16} />
                  {currentTheme.id === theme.id ? 'Active Theme' : 'Select Theme'}
                </motion.button>
              </Card>
            </motion.div>
          ))}
        </SimpleGrid>
      </motion.div>

      {/* Theme Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Card className="card-elevated">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <Text size="xl" fw={700} c="primary">{availableThemes.length}</Text>
                <Text size="sm" c="muted">Beautiful Themes</Text>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
                <Check className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <Text size="xl" fw={700} c="success">100%</Text>
                <Text size="sm" c="muted">Accessible</Text>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg">
                <Palette className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <Text size="xl" fw={700} c="warning">∞</Text>
                <Text size="sm" c="muted">Customizable</Text>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-info-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-info-600" />
              </div>
              <div>
                <Text size="xl" fw={700} c="info">Free</Text>
                <Text size="sm" c="muted">No Extra Cost</Text>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      >
        <Card className="card-clean border-info-200 bg-info-50/50">
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-info-100 rounded-lg flex-shrink-0">
              <Sparkles className="h-4 w-4 text-info-600" />
            </div>
            <div>
              <Text size="sm" fw={600} c="info" mb="xs">Pro Tip</Text>
              <Text size="sm" c="muted">
                Your theme preference is automatically saved and will be remembered across all your devices. You can change it anytime from your settings.
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}