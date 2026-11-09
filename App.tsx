import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { MapPicker } from './src/components/MapPicker';
import { locations } from './src/data/locations';
import { calculateHaversineDistanceKm, scoreFromDistance } from './src/utils/haversine';
import { GuessPosition, Location, RoundResult } from './src/types/game';

const TOTAL_ROUNDS = locations.length;

function shuffleLocations(items: Location[]): Location[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(0)} km`;
}

export default function App() {
  const [roundSequence] = useState<Location[]>(() => shuffleLocations(locations));
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedGuess, setSelectedGuess] = useState<GuessPosition | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Escolha um ponto no mapa');

  const currentLocation = roundSequence[roundIndex];
  const isLastRound = roundIndex === roundSequence.length - 1;
  const mapKey = `map-${roundIndex}`;

  const roundLabel = useMemo(
    () => `Ronda ${roundIndex + 1}/${TOTAL_ROUNDS}`,
    [roundIndex]
  );

  const resetRoundState = () => {
    setSelectedGuess(null);
    setResult(null);
    setIsResultVisible(false);
    setStatusMessage('Escolha um ponto no mapa');
  };

  const handleGuessConfirm = () => {
    if (!selectedGuess) {
      setStatusMessage('Primeiro escolha um ponto no mapa.');
      return;
    }

    // Aplicação direta da fórmula de Haversine para obter a distância real em km.
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
    setIsResultVisible(true);
    setStatusMessage(`${currentLocation.label} • ${formatDistance(distanceKm)}`);
  };

  const handleNextRound = () => {
    if (roundIndex < roundSequence.length - 1) {
      setRoundIndex((previousIndex) => previousIndex + 1);
      resetRoundState();
      return;
    }

    // Reinício do jogo ao terminar as rondas disponíveis.
    setRoundIndex(0);
    setTotalScore(0);
    setStatusMessage('Jogo reiniciado');
    resetRoundState();
  };

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
            <Image source={{ uri: currentLocation.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageGradient} />
            <Text style={styles.locationLabel}>{currentLocation.label}</Text>
          </View>
        </View>

        <View style={styles.mapSection}>
          <MapPicker key={mapKey} onLocationPick={setSelectedGuess} mapKey={mapKey} />

          <View style={styles.pinHint}>
            <Text style={styles.hintText}>{statusMessage}</Text>
          </View>

          <Pressable
            style={[styles.confirmButton, result ? styles.confirmButtonDisabled : null]}
            disabled={Boolean(result)}
            onPress={handleGuessConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirmar Palpite</Text>
          </Pressable>
        </View>
      </View>

      <Modal transparent animationType="slide" visible={isResultVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Resultado da ronda</Text>

            {result ? (
              <>
                <Text style={styles.metricLabel}>Distância</Text>
                <Text style={styles.metricValue}>{formatDistance(result.distanceKm)}</Text>

                <Text style={styles.metricLabel}>Pontuação</Text>
                <Text style={styles.metricValue}>{result.points} pts</Text>
              </>
            ) : null}

            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (isLastRound) {
                  setRoundIndex(0);
                  setTotalScore(0);
                  setStatusMessage('Novo jogo iniciado');
                  resetRoundState();
                  setIsResultVisible(false);
                  return;
                }

                setRoundIndex((previousIndex) => previousIndex + 1);
                resetRoundState();
                setIsResultVisible(false);
              }}
            >
              <Text style={styles.primaryButtonText}>
                {isLastRound ? 'Jogar de Novo' : 'Avançar para a Próxima Ronda'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07131d'
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
  confirmButtonDisabled: {
    opacity: 0.55
  },
  confirmButtonText: {
    color: '#06161f',
    fontSize: 16,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 12, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  modalCard: {
    backgroundColor: '#0b1d2a',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  modalTitle: {
    color: '#edfaff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18
  },
  metricLabel: {
    color: '#89a6b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10
  },
  metricValue: {
    color: '#f5fdff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 5
  },
  primaryButton: {
    backgroundColor: '#69d6ff',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 22,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#07131d',
    fontSize: 15,
    fontWeight: '800'
  }
});
