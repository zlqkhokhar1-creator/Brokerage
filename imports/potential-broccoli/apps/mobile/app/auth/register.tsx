import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<any>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    address: { line1: '', city: '', state: '', postalCode: '', country: '' },
    investmentGoals: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await register(form);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
      <TextInput placeholder="First Name" style={styles.input} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
      <TextInput placeholder="Last Name" style={styles.input} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
      <TextInput placeholder="Phone" keyboardType="phone-pad" style={styles.input} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
      <TextInput placeholder="Date of Birth (YYYY-MM-DD)" style={styles.input} value={form.dateOfBirth} onChangeText={(v) => setForm({ ...form, dateOfBirth: v })} />
      <TextInput placeholder="Nationality" style={styles.input} value={form.nationality} onChangeText={(v) => setForm({ ...form, nationality: v })} />
      <TextInput placeholder="Address Line 1" style={styles.input} value={form.address.line1} onChangeText={(v) => setForm({ ...form, address: { ...form.address, line1: v } })} />
      <TextInput placeholder="City" style={styles.input} value={form.address.city} onChangeText={(v) => setForm({ ...form, address: { ...form.address, city: v } })} />
      <TextInput placeholder="State" style={styles.input} value={form.address.state} onChangeText={(v) => setForm({ ...form, address: { ...form.address, state: v } })} />
      <TextInput placeholder="Postal Code" style={styles.input} value={form.address.postalCode} onChangeText={(v) => setForm({ ...form, address: { ...form.address, postalCode: v } })} />
      <TextInput placeholder="Country" style={styles.input} value={form.address.country} onChangeText={(v) => setForm({ ...form, address: { ...form.address, country: v } })} />
      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create Account'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#dc2626' },
});

