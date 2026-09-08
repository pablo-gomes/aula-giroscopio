import React from 'react';
import { View } from 'react-native';
import CosmicGame from '../components/CosmicGame';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#070a13' }}>
      <CosmicGame />
    </View>
  );
}
