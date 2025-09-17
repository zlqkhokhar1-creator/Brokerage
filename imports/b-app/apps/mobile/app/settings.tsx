import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useProfile, useUpdateProfile } from '@/src/hooks/account';
import { useAuth } from '@/src/contexts/AuthContext';

export default function SettingsScreen() {
  const { data } = useProfile();
  const { mutateAsync: update } = useUpdateProfile();
  const { logout } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  React.useEffect(() => {
    if (data) {
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setPhone(data.phone || '');
    }
  }, [data]);

  const onSave = async () => {
    await update({ firstName, lastName, phone });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}><Text style={styles.label}>First Name</Text><TextInput style={styles.input} value={firstName} onChangeText={setFirstName} /></View>
      <View style={styles.row}><Text style={styles.label}>Last Name</Text><TextInput style={styles.input} value={lastName} onChangeText={setLastName} /></View>
      <View style={styles.row}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View>
      <TouchableOpacity style={styles.save} onPress={onSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
      <TouchableOpacity style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  row: { gap: 8 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  save: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  logout: { backgroundColor: '#0b1220', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#fff', fontWeight: '700' },
});

