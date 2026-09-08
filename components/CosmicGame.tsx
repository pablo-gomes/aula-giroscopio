import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Gyroscope } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configurações do jogo
const PLAYER_SIZE = 46;
const CRYSTAL_SIZE = 26;
const HAZARD_SIZE = 44;
const POWERUP_SIZE = 32;

// Tipos
interface Position {
  x: number;
  y: number;
}

interface Velocity {
  vx: number;
  vy: number;
}

interface Crystal {
  id: number;
  x: number;
  y: number;
  type: 'cyan' | 'gold';
  points: number;
}

interface Hazard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: 'shield' | 'magnet';
  expiresAt: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

// Gera posição aleatória segura dentro da tela jogável
const getRandomPos = (margin: number = 50) => ({
  x: Math.random() * (SCREEN_WIDTH - margin * 2) + margin,
  y: Math.random() * (SCREEN_HEIGHT - margin * 2 - 120) + margin + 80,
});

export default function CosmicGame() {
  // Estados do Jogo
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);
  const [hasShield, setHasShield] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);

  // Estados Visuais para Renderização
  const [playerRenderPos, setPlayerRenderPos] = useState<Position>({
    x: SCREEN_WIDTH / 2 - PLAYER_SIZE / 2,
    y: SCREEN_HEIGHT / 2 - PLAYER_SIZE / 2,
  });
  const [crystals, setCrystals] = useState<Crystal[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [tiltDisplay, setTiltDisplay] = useState({ x: 0, y: 0 });

  // Refs de Física para Loop sem Travar Render
  const playerPosRef = useRef<Position>({
    x: SCREEN_WIDTH / 2 - PLAYER_SIZE / 2,
    y: SCREEN_HEIGHT / 2 - PLAYER_SIZE / 2,
  });
  const playerVelRef = useRef<Velocity>({ vx: 0, vy: 0 });
  const gyroOffsetRef = useRef({ x: 0, y: 0 });
  const rawGyroRef = useRef({ x: 0, y: 0, z: 0 });
  const crystalsRef = useRef<Crystal[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScoreRef = useRef(0);
  const isGameOverRef = useRef(false);

  // Feedback Háptico Seguro
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    try {
      if (Platform.OS === 'web') return;
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignora erro se dispositivo não suportar háptico
    }
  };

  // Efeito de Partículas
  const spawnParticles = (x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 4 + 2;
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 5 + 3,
        alpha: 1,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Texto Flutuante
  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    const newText: FloatingText = {
      id: Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
    };
    floatingTextsRef.current = [...floatingTextsRef.current, newText];
  };

  // Inicializar Sensores do Giroscópio
  useEffect(() => {
    let subscription: any = null;

    Gyroscope.isAvailableAsync().then((available) => {
      setSensorAvailable(available);
      if (available) {
        Gyroscope.setUpdateInterval(16); // ~60fps
        subscription = Gyroscope.addListener((data) => {
          rawGyroRef.current = data;
        });
      }
    });

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Calibrar Giroscópio (Zero atual)
  const calibrateGyro = () => {
    gyroOffsetRef.current = {
      x: rawGyroRef.current.y,
      y: rawGyroRef.current.x,
    };
    triggerHaptic('light');
    spawnFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'Calibrado!', '#00f7ff');
  };

  // Iniciar Novo Jogo
  const startGame = () => {
    isGameOverRef.current = false;
    setScore(0);
    lastScoreRef.current = 0;
    setLives(3);
    setCombo(1);
    setHasShield(true); // Começa com escudo inicial
    setMagnetActive(false);

    playerPosRef.current = {
      x: SCREEN_WIDTH / 2 - PLAYER_SIZE / 2,
      y: SCREEN_HEIGHT / 2 - PLAYER_SIZE / 2,
    };
    playerVelRef.current = { vx: 0, vy: 0 };

    // Cristais Iniciais
    const initialCrystals: Crystal[] = [
      { id: 1, ...getRandomPos(), type: 'cyan', points: 10 },
      { id: 2, ...getRandomPos(), type: 'cyan', points: 10 },
      { id: 3, ...getRandomPos(), type: 'gold', points: 25 },
    ];
    crystalsRef.current = initialCrystals;
    setCrystals(initialCrystals);

    // Obstáculos Iniciais
    const initialHazards: Hazard[] = [
      {
        id: 1,
        ...getRandomPos(80),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: HAZARD_SIZE / 2,
      },
    ];
    hazardsRef.current = initialHazards;
    setHazards(initialHazards);

    // Power-ups
    const initialPowerUps: PowerUp[] = [
      { id: 1, ...getRandomPos(), type: 'shield', expiresAt: Date.now() + 15000 },
    ];
    powerUpsRef.current = initialPowerUps;
    setPowerUps(initialPowerUps);

    particlesRef.current = [];
    floatingTextsRef.current = [];

    setGameState('playing');
    triggerHaptic('success');
  };

  // Loop de Física em 60fps
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animFrame: number;

    const gameLoop = () => {
      if (isGameOverRef.current) return;

      // 1. Atualizar Giroscópio / Aceleração
      const tiltY = rawGyroRef.current.x - gyroOffsetRef.current.y;
      const tiltX = rawGyroRef.current.y - gyroOffsetRef.current.x;

      setTiltDisplay({ x: Math.round(tiltX * 10) / 10, y: Math.round(tiltY * 10) / 10 });

      // Sensibilidade e física de inércia
      const SENSITIVITY = 1.8;
      const FRICTION = 0.94;
      const MAX_SPEED = 14;

      playerVelRef.current.vx = (playerVelRef.current.vx + tiltX * SENSITIVITY) * FRICTION;
      playerVelRef.current.vy = (playerVelRef.current.vy - tiltY * SENSITIVITY) * FRICTION;

      // Limitar velocidade máxima
      playerVelRef.current.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, playerVelRef.current.vx));
      playerVelRef.current.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, playerVelRef.current.vy));

      // Atualizar posição do jogador
      let nextX = playerPosRef.current.x + playerVelRef.current.vx;
      let nextY = playerPosRef.current.y + playerVelRef.current.vy;

      // Colisão elástica com bordas da tela (Rebatimento suave)
      const MIN_Y = 70;
      const MAX_Y = SCREEN_HEIGHT - PLAYER_SIZE - 20;
      const MIN_X = 10;
      const MAX_X = SCREEN_WIDTH - PLAYER_SIZE - 10;

      if (nextX < MIN_X) {
        nextX = MIN_X;
        playerVelRef.current.vx = -playerVelRef.current.vx * 0.5;
        triggerHaptic('light');
      } else if (nextX > MAX_X) {
        nextX = MAX_X;
        playerVelRef.current.vx = -playerVelRef.current.vx * 0.5;
        triggerHaptic('light');
      }

      if (nextY < MIN_Y) {
        nextY = MIN_Y;
        playerVelRef.current.vy = -playerVelRef.current.vy * 0.5;
        triggerHaptic('light');
      } else if (nextY > MAX_Y) {
        nextY = MAX_Y;
        playerVelRef.current.vy = -playerVelRef.current.vy * 0.5;
        triggerHaptic('light');
      }

      playerPosRef.current = { x: nextX, y: nextY };
      setPlayerRenderPos({ x: nextX, y: nextY });

      const pCenterX = nextX + PLAYER_SIZE / 2;
      const pCenterY = nextY + PLAYER_SIZE / 2;

      // 2. Colisão com Cristais & Efeito Ímã
      const updatedCrystals: Crystal[] = [];
      crystalsRef.current.forEach((crystal) => {
        let cX = crystal.x;
        let cY = crystal.y;

        // Se o ímã estiver ativo, atrair o cristal
        if (magnetActive) {
          const mdx = pCenterX - (cX + CRYSTAL_SIZE / 2);
          const mdy = pCenterY - (cY + CRYSTAL_SIZE / 2);
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 250 && mDist > 0) {
            cX += (mdx / mDist) * 6;
            cY += (mdy / mDist) * 6;
          }
        }

        const dx = pCenterX - (cX + CRYSTAL_SIZE / 2);
        const dy = pCenterY - (cY + CRYSTAL_SIZE / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (PLAYER_SIZE + CRYSTAL_SIZE) / 2) {
          // Coletado!
          const pts = crystal.points * combo;
          setScore((s) => {
            const newScore = s + pts;
            lastScoreRef.current = newScore;
            return newScore;
          });

          // Combo logic
          setCombo((c) => {
            const nextCombo = Math.min(c + 1, 5);
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => {
              setCombo(1);
            }, 2500);
            return nextCombo;
          });

          triggerHaptic('light');
          spawnParticles(cX + CRYSTAL_SIZE / 2, cY + CRYSTAL_SIZE / 2, crystal.type === 'gold' ? '#f1c40f' : '#00f7ff', 10);
          spawnFloatingText(cX, cY, `+${pts}${combo > 1 ? ` (x${combo})` : ''}`, crystal.type === 'gold' ? '#f1c40f' : '#00f7ff');

          // Respawn em novo ponto
          updatedCrystals.push({
            id: Math.random(),
            ...getRandomPos(),
            type: Math.random() > 0.7 ? 'gold' : 'cyan',
            points: Math.random() > 0.7 ? 25 : 10,
          });
        } else {
          updatedCrystals.push({ ...crystal, x: cX, y: cY });
        }
      });
      crystalsRef.current = updatedCrystals;
      setCrystals([...updatedCrystals]);

      // 3. Obstáculos / Buracos Negros (Movimento + Colisão)
      const updatedHazards: Hazard[] = [];
      hazardsRef.current.forEach((hazard) => {
        let hX = hazard.x + hazard.vx;
        let hY = hazard.y + hazard.vy;

        // Bater nas paredes
        if (hX < 10 || hX > SCREEN_WIDTH - HAZARD_SIZE - 10) hazard.vx *= -1;
        if (hY < MIN_Y || hY > MAX_Y) hazard.vy *= -1;

        // Distância do jogador
        const hCenterX = hX + HAZARD_SIZE / 2;
        const hCenterY = hY + HAZARD_SIZE / 2;
        const dx = pCenterX - hCenterX;
        const dy = pCenterY - hCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Força de atração gravitacional se estiver perto
        if (dist < 110 && dist > 15) {
          playerVelRef.current.vx -= (dx / dist) * 0.4;
          playerVelRef.current.vy -= (dy / dist) * 0.4;
        }

        // Colisão com buraco negro
        if (dist < (PLAYER_SIZE + HAZARD_SIZE) / 2 - 4) {
          if (hasShield) {
            // Escudo absorve dano
            setHasShield(false);
            triggerHaptic('medium');
            spawnParticles(pCenterX, pCenterY, '#9b59b6', 15);
            spawnFloatingText(pCenterX, pCenterY, 'Escudo Quebrado!', '#e74c3c');
            // Afastar obstáculo
            hX += hazard.vx * -20;
            hY += hazard.vy * -20;
          } else {
            // Perde vida
            triggerHaptic('heavy');
            spawnParticles(pCenterX, pCenterY, '#e74c3c', 20);
            spawnFloatingText(pCenterX, pCenterY, '-1 Vida!', '#e74c3c');

            setLives((curr) => {
              const remaining = curr - 1;
              if (remaining <= 0) {
                // Game Over
                isGameOverRef.current = true;
                setGameState('gameover');
                triggerHaptic('error');
                setHighScore((prev) => Math.max(prev, lastScoreRef.current));
              }
              return remaining;
            });
            // Teleporta o obstáculo para longe
            const newPos = getRandomPos(100);
            hX = newPos.x;
            hY = newPos.y;
          }
        }

        updatedHazards.push({ ...hazard, x: hX, y: hY });
      });
      hazardsRef.current = updatedHazards;
      setHazards([...updatedHazards]);

      // Spawn gradual de novos obstáculos conforme pontuação aumenta
      if (hazardsRef.current.length < 4 && lastScoreRef.current > hazardsRef.current.length * 150) {
        hazardsRef.current.push({
          id: Math.random(),
          ...getRandomPos(80),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: HAZARD_SIZE / 2,
        });
      }

      // 4. Power-ups
      const updatedPowerUps: PowerUp[] = [];
      powerUpsRef.current.forEach((pu) => {
        const puCenterX = pu.x + POWERUP_SIZE / 2;
        const puCenterY = pu.y + POWERUP_SIZE / 2;
        const dx = pCenterX - puCenterX;
        const dy = pCenterY - puCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (PLAYER_SIZE + POWERUP_SIZE) / 2) {
          // Coletou Power-up
          triggerHaptic('medium');
          if (pu.type === 'shield') {
            setHasShield(true);
            spawnFloatingText(puCenterX, puCenterY, '🛡️ Escudo Ativado!', '#3498db');
          } else if (pu.type === 'magnet') {
            setMagnetActive(true);
            spawnFloatingText(puCenterX, puCenterY, '🧲 Super Ímã!', '#e67e22');
            setTimeout(() => setMagnetActive(false), 8000);
          }
          spawnParticles(puCenterX, puCenterY, '#f39c12', 12);
        } else if (Date.now() < pu.expiresAt) {
          updatedPowerUps.push(pu);
        }
      });

      // Spawn periódico de power-up se não houver nenhum
      if (updatedPowerUps.length === 0 && Math.random() < 0.008) {
        updatedPowerUps.push({
          id: Math.random(),
          ...getRandomPos(),
          type: Math.random() > 0.5 ? 'shield' : 'magnet',
          expiresAt: Date.now() + 10000,
        });
      }
      powerUpsRef.current = updatedPowerUps;
      setPowerUps([...updatedPowerUps]);

      // 5. Atualizar Partículas
      const remainingParticles = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          alpha: p.alpha - 0.04,
        }))
        .filter((p) => p.alpha > 0);
      particlesRef.current = remainingParticles;
      setParticles([...remainingParticles]);

      // 6. Atualizar Textos Flutuantes
      const remainingTexts = floatingTextsRef.current
        .map((t) => ({
          ...t,
          y: t.y - 1.2,
          alpha: t.alpha - 0.03,
        }))
        .filter((t) => t.alpha > 0);
      floatingTextsRef.current = remainingTexts;
      setFloatingTexts([...remainingTexts]);

      animFrame = requestAnimationFrame(gameLoop);
    };

    animFrame = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [gameState, hasShield, magnetActive, combo]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Grade e Estrelas de Fundo */}
      <View style={styles.backgroundEffect}>
        <View style={[styles.bgStar, { top: 100, left: 40 }]} />
        <View style={[styles.bgStar, { top: 220, right: 60, opacity: 0.4 }]} />
        <View style={[styles.bgStar, { top: 400, left: 80, opacity: 0.8 }]} />
        <View style={[styles.bgStar, { top: 580, right: 40 }]} />
        <View style={[styles.bgStar, { top: 700, left: 150, opacity: 0.5 }]} />
      </View>

      {/* HUD Superior */}
      <View style={styles.hud}>
        <View>
          <Text style={styles.scoreLabel}>PONTOS</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>

        {combo > 1 && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>COMBO x{combo}!</Text>
          </View>
        )}

        <View style={styles.rightHud}>
          <View style={styles.livesContainer}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Text key={i} style={[styles.heart, { opacity: i < lives ? 1 : 0.2 }]}>
                ❤️
              </Text>
            ))}
          </View>

          {/* Botão de Calibrar */}
          <TouchableOpacity style={styles.calibrateButton} onPress={calibrateGyro} activeOpacity={0.7}>
            <Text style={styles.calibrateButtonText}>🎯 Calibrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Indicador de Status dos Powerups */}
      <View style={styles.statusIndicators}>
        {hasShield && (
          <View style={styles.statusPillShield}>
            <Text style={styles.statusPillText}>🛡️ Escudo Ativo</Text>
          </View>
        )}
        {magnetActive && (
          <View style={styles.statusPillMagnet}>
            <Text style={styles.statusPillText}>🧲 Ímã Ativo</Text>
          </View>
        )}
      </View>

      {/* Campo de Jogo */}
      {gameState === 'playing' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Cristais Colecionáveis */}
          {crystals.map((c) => (
            <View
              key={c.id}
              style={[
                styles.crystal,
                c.type === 'gold' ? styles.goldCrystal : styles.cyanCrystal,
                { left: c.x, top: c.y },
              ]}
            >
              <View style={styles.crystalCore} />
            </View>
          ))}

          {/* Obstáculos / Buracos Negros */}
          {hazards.map((h) => (
            <View
              key={h.id}
              style={[styles.hazard, { left: h.x, top: h.y }]}
            >
              <View style={styles.hazardCore} />
              <View style={styles.hazardRing} />
            </View>
          ))}

          {/* Power-ups */}
          {powerUps.map((p) => (
            <View
              key={p.id}
              style={[
                styles.powerUp,
                p.type === 'shield' ? styles.shieldPowerUp : styles.magnetPowerUp,
                { left: p.x, top: p.y },
              ]}
            >
              <Text style={styles.powerUpIcon}>{p.type === 'shield' ? '🛡️' : '🧲'}</Text>
            </View>
          ))}

          {/* Partículas de Impacto */}
          {particles.map((p) => (
            <View
              key={p.id}
              style={[
                styles.particle,
                {
                  left: p.x,
                  top: p.y,
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  opacity: p.alpha,
                },
              ]}
            />
          ))}

          {/* Textos Flutuantes */}
          {floatingTexts.map((t) => (
            <Text
              key={t.id}
              style={[
                styles.floatingText,
                {
                  left: t.x - 40,
                  top: t.y,
                  color: t.color,
                  opacity: t.alpha,
                },
              ]}
            >
              {t.text}
            </Text>
          ))}

          {/* Nave / Orbe do Jogador */}
          <View
            style={[
              styles.player,
              { left: playerRenderPos.x, top: playerRenderPos.y },
              hasShield && styles.playerShieldGlow,
            ]}
          >
            <View style={styles.playerInnerOrb} />
            <View style={styles.playerThruster} />
          </View>
        </View>
      )}

      {/* Rodapé com Informações do Sensor */}
      <View style={styles.footer}>
        <Text style={styles.sensorStatus}>
          {sensorAvailable
            ? `Inclinação: X: ${tiltDisplay.x} | Y: ${tiltDisplay.y}`
            : '⚠️ Giroscópio indisponível (usando simulação)'}
        </Text>
      </View>

      {/* Tela de Menu / Boas-vindas */}
      {gameState === 'menu' && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.gameTitle}>COSMIC DRIFT</Text>
            <Text style={styles.gameSubtitle}>Controle sua nave com o giroscópio!</Text>

            <View style={styles.rulesBox}>
              <Text style={styles.ruleItem}>📱 <Text style={styles.bold}>Incline o celular</Text> para mover o orbe</Text>
              <Text style={styles.ruleItem}>💎 Colete <Text style={styles.bold}>Cristais de Energia</Text> para pontuar</Text>
              <Text style={styles.ruleItem}>⚡ Faça <Text style={styles.bold}>Combos rápidos</Text> para multiplicar pontos</Text>
              <Text style={styles.ruleItem}>🌌 Evite os <Text style={styles.bold}>Buracos Negros</Text> que sugam e danificam</Text>
              <Text style={styles.ruleItem}>🛡️ Colete escudos e super ímãs</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={startGame} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>DECOLAR 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tela de Game Over */}
      {gameState === 'gameover' && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.gameOverTitle}>FIM DE JOGO</Text>
            <Text style={styles.finalScoreLabel}>Sua Pontuação:</Text>
            <Text style={styles.finalScoreValue}>{score}</Text>

            {score >= highScore && score > 0 && (
              <View style={styles.newRecordBadge}>
                <Text style={styles.newRecordText}>🏆 NOVO RECORDE!</Text>
              </View>
            )}

            <Text style={styles.highScoreText}>Melhor Pontuação: {highScore}</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={startGame} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>JOGAR NOVAMENTE 🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
  },
  backgroundEffect: {
    ...StyleSheet.absoluteFillObject,
  },
  bgStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 1.5,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  scoreLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#8b9bb4',
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00f7ff',
    textShadowColor: 'rgba(0, 247, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  comboBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#f39c12',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  comboText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  rightHud: {
    alignItems: 'flex-end',
  },
  livesContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  heart: {
    fontSize: 18,
    marginLeft: 3,
  },
  calibrateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  calibrateButtonText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicators: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    zIndex: 10,
  },
  statusPillShield: {
    backgroundColor: 'rgba(52, 152, 219, 0.25)',
    borderWidth: 1,
    borderColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillMagnet: {
    backgroundColor: 'rgba(230, 126, 34, 0.25)',
    borderWidth: 1,
    borderColor: '#e67e22',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    backgroundColor: '#00f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f7ff',
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  playerInnerOrb: {
    width: PLAYER_SIZE / 2,
    height: PLAYER_SIZE / 2,
    borderRadius: PLAYER_SIZE / 4,
    backgroundColor: '#ffffff',
  },
  playerThruster: {
    position: 'absolute',
    bottom: -4,
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f7ff',
    opacity: 0.7,
  },
  playerShieldGlow: {
    borderWidth: 3,
    borderColor: '#9b59b6',
    shadowColor: '#9b59b6',
    shadowRadius: 20,
    shadowOpacity: 1,
  },
  crystal: {
    position: 'absolute',
    width: CRYSTAL_SIZE,
    height: CRYSTAL_SIZE,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cyanCrystal: {
    backgroundColor: '#00f7ff',
    shadowColor: '#00f7ff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  goldCrystal: {
    backgroundColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  crystalCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  hazard: {
    position: 'absolute',
    width: HAZARD_SIZE,
    height: HAZARD_SIZE,
    borderRadius: HAZARD_SIZE / 2,
    backgroundColor: '#1a052e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 7,
  },
  hazardCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000000',
  },
  hazardRing: {
    position: 'absolute',
    width: HAZARD_SIZE + 10,
    height: HAZARD_SIZE + 10,
    borderRadius: (HAZARD_SIZE + 10) / 2,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.4)',
    borderStyle: 'dashed',
  },
  powerUp: {
    position: 'absolute',
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    borderRadius: POWERUP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 6,
  },
  shieldPowerUp: {
    backgroundColor: '#2980b9',
    shadowColor: '#3498db',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  magnetPowerUp: {
    backgroundColor: '#d35400',
    shadowColor: '#e67e22',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  powerUpIcon: {
    fontSize: 16,
  },
  particle: {
    position: 'absolute',
  },
  floatingText: {
    position: 'absolute',
    width: 120,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sensorStatus: {
    color: '#4a5568',
    fontSize: 11,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 10, 19, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121829',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 247, 255, 0.3)',
    shadowColor: '#00f7ff',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00f7ff',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  gameSubtitle: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: 20,
  },
  rulesBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  ruleItem: {
    fontSize: 13,
    color: '#cbd5e0',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#ffffff',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#00f7ff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#00f7ff',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#070a13',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gameOverTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e74c3c',
    letterSpacing: 2,
    marginBottom: 10,
  },
  finalScoreLabel: {
    fontSize: 13,
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  finalScoreValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  newRecordBadge: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  newRecordText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
  },
  highScoreText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 22,
  },
});
