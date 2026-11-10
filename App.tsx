import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { MapPicker } from './src/components/MapPicker';
import { buildRoundSequence } from './src/services/locationService';
import { calculateHaversineDistanceKm, scoreFromDistance } from './src/utils/haversine';
import { GuessPosition, Location, RoundResult } from './src/types/game';

const DEFAULT_ROUNDS = 4;

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(0)} km`;
}

export default function App() {
  const [roundSequence, setRoundSequence] = useState<Location[]>([]);
  const [playedLocationIds, setPlayedLocationIds] = useState<string[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedGuess, setSelectedGuess] = useState<GuessPosition | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState('A carregar locais...');
  const [isLoading, setIsLoading] = useState(true);

  const totalRounds = Math.max(roundSequence.length, DEFAULT_ROUNDS);

  const currentLocation = roundSequence[roundIndex];
  const isLastRound = roundIndex === Math.max(roundSequence.length - 1, 0);
  const mapKey = `map-${roundIndex}`;

  const roundLabel = useMemo(
    () => `Ronda ${Math.min(roundIndex + 1, totalRounds)}/${totalRounds}`,
    [roundIndex, totalRounds]
  );

  const loadRoundSequence = async (historyIds: string[] = playedLocationIds) => {
    setIsLoading(true);
    try {
      const sequence = await buildRoundSequence(DEFAULT_ROUNDS, historyIds);
      setRoundSequence(sequence);
      setPlayedLocationIds([...historyIds, ...sequence.map((location) => location.id)]);
      setRoundIndex(0);
      setResult(null);
      setSelectedGuess(null);
      setStatusMessage('Escolha um ponto no mapa');
    } catch (error) {
      console.warn('Não foi possível preparar a sequência de rondas:', error);
      setStatusMessage('Erro ao carregar locais; usando fallback local.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapGame = async () => {
      if (!isMounted) {
        return;
      }

      await loadRoundSequence();
    };

    void bootstrapGame();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetRoundState = () => {
    setSelectedGuess(null);
    setResult(null);
    setStatusMessage('Escolha um ponto no mapa');
  };

  const handleGuessConfirm = () => {
    if (!selectedGuess || !currentLocation) {
      setStatusMessage('Primeiro escolha um ponto no mapa.');
      return;
    }

    const distanceKm = calculateHaversineDistanceKm(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedGuess.latitude,
      selectedGuess.longitude
    );

    const points = scoreFromDistance(distanceKm);
    const finalResult = { distanceKm, points };

    setResult(finalResult);
    setTotalScore((previousScore) => previousScore + points);
    setStatusMessage(`${currentLocation.label} • ${formatDistance(distanceKm)} • ${points} pts`);
  };

  const advanceToNextRound = async () => {
    if (!currentLocation) {
      return;
    }

    if (roundIndex < roundSequence.length - 1) {
      setRoundIndex((previousIndex) => previousIndex + 1);
      resetRoundState();
      return;
    }

    await loadRoundSequence(playedLocationIds);
    setTotalScore(0);
  };

  if (isLoading || !currentLocation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>A carregar locais...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.headerRow}>
            <Text style={styles.roundBadge}>{roundLabel}</Text>
            <Text style={styles.totalScore}>{totalScore} pts</Text>
          </View>

          <View style={styles.imageCard}>
            <Image
              key={currentLocation.id}
              source={{ uri: currentLocation.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageGradient} />
            <Text style={styles.locationLabel}>{currentLocation.label}</Text>
          </View>
        </View>

        <View style={styles.mapSection}>
          <MapPicker
            key={mapKey}
            onLocationPick={setSelectedGuess}
            mapKey={mapKey}
            guessPosition={selectedGuess}
            answerPosition={result ? currentLocation : null}
          />

          <View style={styles.pinHint}>
            <Text style={styles.hintText}>{statusMessage}</Text>
          </View>

          <Pressable style={styles.confirmButton} onPress={result ? advanceToNextRound : handleGuessConfirm}>
            <Text style={styles.confirmButtonText}>
              {result ? (isLastRound ? 'Jogar de Novo' : 'Avançar para a Próxima Ronda') : 'Confirmar Palpite'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07131d'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07131d'
  },
  loadingText: {
    color: '#eaf9ff',
    fontSize: 18,
    fontWeight: '700'
  },
  container: {
    flex: 1,
    backgroundColor: '#07131d',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18
  },
  topSection: {
    flex: 1,
    minHeight: 240,
    marginBottom: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  roundBadge: {
    backgroundColor: '#0f2a3b',
    color: '#eaf9ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6
  },
  totalScore: {
    color: '#77dbff',
    fontWeight: '800',
    fontSize: 15
  },
  imageCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0d1e2b'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  imageGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.26)'
  },
  locationLabel: {
    position: 'absolute',
    left: 16,
    bottom: 18,
    right: 16,
    color: '#f4fbff',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  mapSection: {
    flex: 1,
    minHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f2330',
    position: 'relative'
  },
  pinHint: {
    position: 'absolute',
    left: 12,
    top: 12,
    right: 12,
    zIndex: 5,
    alignItems: 'center'
  },
  hintText: {
    backgroundColor: 'rgba(7,19,29,0.7)',
    color: '#eaf9ff',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden'
  },
  confirmButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#6ee3ff',
    borderRadius: 16,
    paddingVertical: 16,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmButtonText: {
    color: '#06161f',
    fontSize: 16,
    fontWeight: '800'
  },
});
