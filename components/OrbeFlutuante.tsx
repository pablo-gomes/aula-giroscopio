import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { Gyroscope } from 'expo-sensors';

const { width, height } = Dimensions.get('window');
const PLAYER_SIZE = 50;
const ORB_SIZE = 30;

const generateRandomPosition = () => {
  const position = {
    x: Math.random() * (width - ORB_SIZE),
    y: Math.random() * (height - ORB_SIZE - 100) + 60,
  };
  return position;
};

export default function OrbeFlutuante() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [playerPosition, setPlayerPosition] = useState({ x: width / 2 - PLAYER_SIZE / 2, y: height / 2 - PLAYER_SIZE / 2 });
  const [orbPosition, setOrbPosition] = useState(generateRandomPosition());
  const [score, setScore] = useState(0);

  useEffect(() => {
    Gyroscope.setUpdateInterval(16);

    const subscription = Gyroscope.addListener(gyroscopeData => {
      setData(gyroscopeData);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setPlayerPosition(prev => {
      let newX = prev.x + data.y * 5;
      let newY = prev.y - data.x * 5;

      if (newX < 0) newX = 0;
      if (newX > width - PLAYER_SIZE) newX = width - PLAYER_SIZE;
      if (newY < 0) newY = 0;
      if (newY > height - PLAYER_SIZE) newY = height - PLAYER_SIZE;

      return { x: newX, y: newY };
    });
  }, [data]);

  useEffect(() => {
    const playerCenterX = playerPosition.x + PLAYER_SIZE / 2;
    const playerCenterY = playerPosition.y + PLAYER_SIZE / 2;
    const orbCenterX = orbPosition.x + ORB_SIZE / 2;
    const orbCenterY = orbPosition.y + ORB_SIZE / 2;

    const dx = playerCenterX - orbCenterX;
    const dy = playerCenterY - orbCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (PLAYER_SIZE + ORB_SIZE) / 2) {
      setOrbPosition(generateRandomPosition());
      setScore(prev => prev + 1);
    }
  }, [playerPosition, orbPosition]);

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>Colete o orbe azul!</Text>
      <Text style={styles.score}>Pontuação: {score}</Text>
      
      <View
        style={[
          styles.orb,
          {
            left: orbPosition.x,
            top: orbPosition.y,
          },
        ]}
      />
      
      <View
        style={[
          styles.player,
          {
            left: playerPosition.x,
            top: playerPosition.y,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  instructions: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  score: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    color: '#3498db',
    fontWeight: '600',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    backgroundColor: 'coral',
    borderWidth: 2,
    borderColor: '#fff',
  },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#3498db',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
