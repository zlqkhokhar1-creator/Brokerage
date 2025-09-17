/**
 * Mobile Paper Trading Dashboard - React Native Component
 * Full-featured paper trading environment for mobile
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
  Modal,
  TextInput,
  Dimensions,
  Vibration,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface PaperTradingAccount {
  accountId: string;
  accountNumber: string;
  initialBalance: number;
  currentBalance: number;
  buyingPower: number;
  features: string[];
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    sharpeRatio: number;
  };
}

interface PaperTrade {
  tradeId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  fillPrice: number;
  fillTime: string;
  commission: number;
}

interface OrderForm {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  orderType: 'MARKET' | 'LIMIT';
  price: string;
}

interface MobilePaperTradingProps {
  userId: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const MobilePaperTradingDashboard: React.FC<MobilePaperTradingProps> = ({
  userId,
}) => {
  const [account, setAccount] = useState<PaperTradingAccount | null>(null);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    symbol: '',
    side: 'BUY',
    quantity: '',
    orderType: 'MARKET',
    price: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    initializePaperTrading();
  }, []);

  const initializePaperTrading = async () => {
    setLoading(true);
    try {
      // First try to get existing account, if none exists, create one
      let accountData = await getExistingAccount();
      
      if (!accountData) {
        accountData = await createPaperTradingAccount();
      }
      
      setAccount(accountData);
      await fetchTrades(accountData.accountId);
    } catch (error) {
      console.error('Failed to initialize paper trading:', error);
      Alert.alert('Error', 'Failed to load paper trading account');
    } finally {
      setLoading(false);
    }
  };

  const getExistingAccount = async (): Promise<PaperTradingAccount | null> => {
    // This would typically fetch from a stored account ID or user preferences
    return null;
  };

  const createPaperTradingAccount = async (): Promise<PaperTradingAccount> => {
    const response = await fetch('/api/v1/advanced/advanced-trading/paper-trading/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        initialBalance: 100000,
        accountType: 'margin',
        simulationMode: 'realistic',
        features: ['options', 'international']
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create paper trading account');
    }

    const data = await response.json();
    return data.data;
  };

  const fetchTrades = async (accountId: string) => {
    // In a real implementation, this would fetch trade history
    setTrades([]);
  };

  const executeTrade = async () => {
    if (!account) return;

    setSubmittingOrder(true);
    
    try {
      const orderData = {
        symbol: orderForm.symbol.toUpperCase(),
        side: orderForm.side,
        quantity: parseInt(orderForm.quantity),
        orderType: orderForm.orderType,
        ...(orderForm.orderType === 'LIMIT' && { price: parseFloat(orderForm.price) })
      };

      const response = await fetch(`/api/v1/advanced/advanced-trading/paper-trading/accounts/${account.accountId}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to execute trade');
      }

      const data = await response.json();
      const newTrade = data.data;

      // Add haptic feedback for successful trade
      Vibration.vibrate([0, 100, 50, 100]);

      setTrades(prev => [newTrade, ...prev]);
      setAccount(prev => prev ? {
        ...prev,
        currentBalance: newTrade.accountBalance,
        buyingPower: newTrade.accountBalance * 2 // Simplified calculation
      } : null);

      // Reset form and close modal
      setOrderForm({
        symbol: '',
        side: 'BUY',
        quantity: '',
        orderType: 'MARKET',
        price: ''
      });
      setOrderModalVisible(false);

      Alert.alert(
        'Trade Executed',
        `Successfully ${newTrade.side.toLowerCase()}ed ${newTrade.quantity} shares of ${newTrade.symbol} at $${newTrade.fillPrice.toFixed(2)}`
      );
    } catch (error) {
      console.error('Trade execution error:', error);
      Alert.alert('Trade Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? Colors.light.success : Colors.light.error;
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Setting up paper trading...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (!account) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load paper trading account</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={initializePaperTrading}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  const performanceChartData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Today'],
    datasets: [
      {
        data: [100000, 101500, 99800, 102300, 101000, account.currentBalance],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }
    ]
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>📊 Paper Trading</ThemedText>
        <ThemedText style={styles.subtitle}>Practice trading with virtual money</ThemedText>
        <ThemedText style={styles.accountNumber}>Account: {account.accountNumber}</ThemedText>
      </ThemedView>

      {/* Account Summary */}
      <ThemedView style={styles.summaryContainer}>
        <ThemedView style={[styles.summaryCard, styles.balanceCard]}>
          <Text style={styles.summaryLabel}>Current Balance</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(account.currentBalance)}
          </Text>
          <Text style={[styles.summaryChange, { color: getPerformanceColor(account.performance.totalReturn) }]}>
            {formatPercentage(account.performance.totalReturnPercent)}
          </Text>
        </ThemedView>
        
        <ThemedView style={[styles.summaryCard, styles.buyingPowerCard]}>
          <Text style={styles.summaryLabel}>Buying Power</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(account.buyingPower)}
          </Text>
          <Text style={styles.summarySubtext}>Available to trade</Text>
        </ThemedView>
      </ThemedView>

      {/* Performance Chart */}
      <ThemedView style={styles.chartContainer}>
        <ThemedText style={styles.sectionTitle}>Portfolio Performance</ThemedText>
        <LineChart
          data={performanceChartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.buyButton]}
          onPress={() => {
            setOrderForm(prev => ({ ...prev, side: 'BUY' }));
            setOrderModalVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>📈 Buy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.sellButton]}
          onPress={() => {
            setOrderForm(prev => ({ ...prev, side: 'SELL' }));
            setOrderModalVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>📉 Sell</Text>
        </TouchableOpacity>
      </ThemedView>

      {/* Recent Trades */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Recent Trades</ThemedText>
        {trades.length > 0 ? (
          trades.slice(0, 5).map((trade) => (
            <ThemedView key={trade.tradeId} style={styles.tradeItem}>
              <ThemedView style={styles.tradeMain}>
                <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                <Text style={[styles.tradeSide, { 
                  color: trade.side === 'BUY' ? Colors.light.success : Colors.light.error 
                }]}>
                  {trade.side} {trade.quantity}
                </Text>
              </ThemedView>
              <ThemedView style={styles.tradeDetails}>
                <Text style={styles.tradePrice}>${trade.fillPrice.toFixed(2)}</Text>
                <Text style={styles.tradeTime}>
                  {new Date(trade.fillTime).toLocaleTimeString()}
                </Text>
              </ThemedView>
            </ThemedView>
          ))
        ) : (
          <ThemedView style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No trades yet. Start trading to see your activity here!</Text>
          </ThemedView>
        )}
      </ThemedView>

      {/* Features */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Available Features</ThemedText>
        <ThemedView style={styles.chipContainer}>
          {account.features.map((feature, index) => (
            <ThemedView key={index} style={styles.chip}>
              <Text style={styles.chipText}>{feature}</Text>
            </ThemedView>
          ))}
        </ThemedView>
      </ThemedView>

      {/* Order Modal */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Place Order</ThemedText>
            <TouchableOpacity onPress={executeTrade} disabled={submittingOrder}>
              <Text style={[styles.modalSubmitButton, submittingOrder && styles.disabledButton]}>
                {submittingOrder ? 'Placing...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={styles.modalContent}>
            {/* Symbol Input */}
            <ThemedView style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Symbol</Text>
              <TextInput
                style={styles.textInput}
                value={orderForm.symbol}
                onChangeText={(text) => setOrderForm(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                placeholder="AAPL"
                autoCapitalize="characters"
              />
            </ThemedView>

            {/* Side Picker */}
            <ThemedView style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Side</Text>
              <Picker
                selectedValue={orderForm.side}
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, side: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Buy" value="BUY" />
                <Picker.Item label="Sell" value="SELL" />
              </Picker>
            </ThemedView>

            {/* Quantity Input */}
            <ThemedView style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.textInput}
                value={orderForm.quantity}
                onChangeText={(text) => setOrderForm(prev => ({ ...prev, quantity: text }))}
                placeholder="100"
                keyboardType="numeric"
              />
            </ThemedView>

            {/* Order Type Picker */}
            <ThemedView style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Order Type</Text>
              <Picker
                selectedValue={orderForm.orderType}
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, orderType: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Market" value="MARKET" />
                <Picker.Item label="Limit" value="LIMIT" />
              </Picker>
            </ThemedView>

            {/* Price Input (for limit orders) */}
            {orderForm.orderType === 'LIMIT' && (
              <ThemedView style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Limit Price</Text>
                <TextInput
                  style={styles.textInput}
                  value={orderForm.price}
                  onChangeText={(text) => setOrderForm(prev => ({ ...prev, price: text }))}
                  placeholder="150.00"
                  keyboardType="decimal-pad"
                />
              </ThemedView>
            )}

            {/* Order Summary */}
            <ThemedView style={styles.orderSummary}>
              <Text style={styles.orderSummaryTitle}>Order Summary</Text>
              <Text style={styles.orderSummaryText}>
                {orderForm.side} {orderForm.quantity || '0'} shares of {orderForm.symbol || 'SYMBOL'}
              </Text>
              {orderForm.orderType === 'LIMIT' && orderForm.price && (
                <Text style={styles.orderSummaryText}>
                  at ${orderForm.price} per share
                </Text>
              )}
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </Modal>
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
    marginBottom: 8,
  },
  accountNumber: {
    fontSize: 14,
    color: Colors.light.secondary,
    fontFamily: 'monospace',
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
  balanceCard: {
    backgroundColor: '#dbeafe',
  },
  buyingPowerCard: {
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
    marginBottom: 2,
  },
  summaryChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#6b7280',
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
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#dcfce7',
  },
  sellButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tradeMain: {
    flex: 1,
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tradeSide: {
    fontSize: 14,
    fontWeight: '500',
  },
  tradeDetails: {
    alignItems: 'flex-end',
  },
  tradePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tradeTime: {
    fontSize: 12,
    color: Colors.light.secondary,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.light.secondary,
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    marginBottom: 16,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalCancelButton: {
    fontSize: 16,
    color: Colors.light.secondary,
  },
  modalSubmitButton: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  orderSummary: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginTop: 20,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  orderSummaryText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 4,
  },
});

export default MobilePaperTradingDashboard;