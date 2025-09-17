/**
 * Mobile Cash Flow Predictor - React Native Component
 * AI-powered dividend cash flow forecasting for mobile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface CashFlowPrediction {
  timeHorizon: string;
  totalPredictedCashFlow: number;
  monthlyBreakdown: Array<{
    month: number;
    predicted: number;
    confidence: number;
  }>;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
  reinvestmentOpportunities: string[];
}

interface MobileCashFlowPredictorProps {
  portfolioId: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const MobileCashFlowPredictor: React.FC<MobileCashFlowPredictorProps> = ({
  portfolioId,
}) => {
  const [prediction, setPrediction] = useState<CashFlowPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState('1Y');
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/advanced/ai-analytics/cash-flow-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          portfolioId,
          timeHorizon
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cash flow prediction');
      }

      const data = await response.json();
      if (data.success) {
        setPrediction(data.data);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portfolioId) {
      fetchPrediction();
    }
  }, [portfolioId, timeHorizon]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return Colors.light.success;
    if (confidence >= 0.6) return Colors.light.warning;
    return Colors.light.error;
  };

  const chartConfig = {
    backgroundColor: Colors.light.background,
    backgroundGradientFrom: Colors.light.background,
    backgroundGradientTo: Colors.light.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#3b82f6"
    }
  };

  const chartData = prediction ? {
    labels: prediction.monthlyBreakdown.slice(0, 6).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }),
    datasets: [
      {
        data: prediction.monthlyBreakdown.slice(0, 6).map(item => item.predicted),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }
    ]
  } : null;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Analyzing portfolio...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>💰 Cash Flow Prediction</ThemedText>
        <ThemedText style={styles.subtitle}>AI-powered dividend forecasting</ThemedText>
        
        {/* Time Horizon Picker */}
        <ThemedView style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Time Horizon:</Text>
          <Picker
            selectedValue={timeHorizon}
            onValueChange={setTimeHorizon}
            style={styles.picker}
          >
            <Picker.Item label="6 Months" value="6M" />
            <Picker.Item label="1 Year" value="1Y" />
            <Picker.Item label="2 Years" value="2Y" />
            <Picker.Item label="5 Years" value="5Y" />
          </Picker>
        </ThemedView>
      </ThemedView>

      {prediction && (
        <>
          {/* Summary Cards */}
          <ThemedView style={styles.summaryContainer}>
            <ThemedView style={[styles.summaryCard, styles.primaryCard]}>
              <Text style={styles.summaryLabel}>Total Predicted</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(prediction.totalPredictedCashFlow)}
              </Text>
            </ThemedView>
            
            <ThemedView style={[styles.summaryCard, styles.secondaryCard]}>
              <Text style={styles.summaryLabel}>Confidence</Text>
              <Text style={[styles.summaryValue, { color: getConfidenceColor(prediction.confidence) }]}>
                {(prediction.confidence * 100).toFixed(1)}%
              </Text>
            </ThemedView>
          </ThemedView>

          {/* Chart */}
          {chartData && (
            <ThemedView style={styles.chartContainer}>
              <ThemedText style={styles.sectionTitle}>Monthly Projections</ThemedText>
              <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </ThemedView>
          )}

          {/* Risk Factors */}
          {prediction.riskFactors.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>⚠️ Risk Factors</ThemedText>
              {prediction.riskFactors.map((factor, index) => (
                <ThemedView key={index} style={styles.riskItem}>
                  <Text style={styles.riskText}>• {factor}</Text>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* AI Recommendations */}
          {prediction.recommendations.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>🤖 AI Recommendations</ThemedText>
              {prediction.recommendations.map((recommendation, index) => (
                <ThemedView key={index} style={styles.recommendationItem}>
                  <Text style={styles.recommendationText}>• {recommendation}</Text>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Reinvestment Opportunities */}
          {prediction.reinvestmentOpportunities.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>📈 Reinvestment Ideas</ThemedText>
              <ThemedView style={styles.chipContainer}>
                {prediction.reinvestmentOpportunities.map((opportunity, index) => (
                  <TouchableOpacity key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{opportunity}</Text>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>
          )}
        </>
      )}

      {error && (
        <ThemedView style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPrediction}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.secondary,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  picker: {
    width: 120,
    height: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#dbeafe',
  },
  secondaryCard: {
    backgroundColor: '#f0f9ff',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  riskItem: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 14,
    color: '#dc2626',
  },
  recommendationItem: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#2563eb',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default MobileCashFlowPredictor;