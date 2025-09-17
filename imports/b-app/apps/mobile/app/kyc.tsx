import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { getApi } from '@/src/lib/api';

export default function KycScreen() {
  const [nationality, setNationality] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async () => {
    const api = await getApi();
    const { data } = await api.post('/compliance/kyc', { nationality, idNumber });
    setStatus(data.data?.status || 'submitted');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Identity Verification</Text>
      <TextInput placeholder="Nationality" style={styles.input} value={nationality} onChangeText={setNationality} />
      <TextInput placeholder="Government ID Number" style={styles.input} value={idNumber} onChangeText={setIdNumber} />
      <TouchableOpacity style={styles.submit} onPress={onSubmit}><Text style={styles.submitText}>Submit</Text></TouchableOpacity>
      {status && <Text style={styles.status}>Status: {status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  submit: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
  status: { color: '#0f172a', marginTop: 8 },
});

