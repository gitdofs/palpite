import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { GuessPosition } from '../types/game';

interface MapPickerProps {
  onLocationPick: (guess: GuessPosition) => void;
  mapKey: string;
  guessPosition: GuessPosition | null;
  answerPosition: GuessPosition | null;
}

export function MapPicker({ onLocationPick, mapKey, guessPosition, answerPosition }: MapPickerProps) {
  const isWeb = Platform.OS === 'web';
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const isRevealed = Boolean(guessPosition && answerPosition);

  const resultLayers =
    guessPosition && answerPosition
      ? `
        const guess = [${guessPosition.latitude}, ${guessPosition.longitude}];
        const answer = [${answerPosition.latitude}, ${answerPosition.longitude}];

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          minZoom: 2,
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);
        L.polyline([guess, answer], { color: '#f5c451', weight: 4, opacity: 0.95 }).addTo(map);
        L.circleMarker(guess, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#ff6b6b',
          fillOpacity: 1
        }).addTo(map).bindTooltip('Seu palpite', { permanent: true, direction: 'top' });
        L.circleMarker(answer, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#22b573',
          fillOpacity: 1
        }).addTo(map).bindTooltip('Local correto', { permanent: true, direction: 'top' });
        map.fitBounds(L.latLngBounds([guess, answer]).pad(0.35), { maxZoom: 5 });
      `
      : '';

  const sourceHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            html, body, #map {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #dfeaf0;
            }
            body {
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map', {
              zoomControl: false,
              attributionControl: true,
              worldCopyJump: true
            }).setView([20, 0], 2);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 18,
              minZoom: 2,
              attribution: 'Tiles &copy; Esri'
            }).addTo(map);

            ${resultLayers || `
              let marker = null;

              map.on('click', function(event) {
                const { lat, lng } = event.latlng;

                if (marker) {
                  map.removeLayer(marker);
                }

                marker = L.marker([lat, lng]).addTo(map);

                const payload = JSON.stringify({ type: 'mapTap', latitude: lat, longitude: lng });
                window.ReactNativeWebView.postMessage(payload);
              });
            `}
          </script>
        </body>
      </html>
    `;
  }, [resultLayers]);

  // Fallback visual e interativo para o navegador, já que o WebView nativo não é suportado em web.
  if (isWeb) {
    const handleWebTap = (event: any) => {
      const target = event.currentTarget as HTMLElement | undefined;
      const width = target?.clientWidth ?? 320;
      const height = target?.clientHeight ?? 520;
      const localX = event.nativeEvent.locationX ?? 0;
      const localY = event.nativeEvent.locationY ?? 0;
      const xRatio = Math.min(Math.max(localX / width, 0), 1);
      const yRatio = Math.min(Math.max(localY / height, 0), 1);

      const longitude = -180 + xRatio * 360;
      const latitude = 90 - yRatio * 180;
      const nextGuess = { latitude, longitude };

      onLocationPick(nextGuess);
    };

    const getMarkerPosition = (position: GuessPosition) => ({
      left: `${((position.longitude + 180) / 360) * 100}%`,
      top: `${((90 - position.latitude) / 180) * 100}%`
    });

    const guessMarkerPosition = guessPosition ? getMarkerPosition(guessPosition) : null;
    const answerMarkerPosition = answerPosition ? getMarkerPosition(answerPosition) : null;
    const guessX = guessPosition ? ((guessPosition.longitude + 180) / 360) * mapSize.width : 0;
    const guessY = guessPosition ? ((90 - guessPosition.latitude) / 180) * mapSize.height : 0;
    const answerX = answerPosition ? ((answerPosition.longitude + 180) / 360) * mapSize.width : 0;
    const answerY = answerPosition ? ((90 - answerPosition.latitude) / 180) * mapSize.height : 0;
    const lineLength = Math.hypot(answerX - guessX, answerY - guessY);
    const lineStyle = {
      left: (guessX + answerX - lineLength) / 2,
      top: (guessY + answerY - 2) / 2,
      width: lineLength,
      transform: [{ rotate: `${Math.atan2(answerY - guessY, answerX - guessX)}rad` }]
    };

    return (
      <Pressable
        style={styles.webMap}
        onPress={handleWebTap}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMapSize({ width, height });
        }}
        disabled={isRevealed}
      >
        <View style={styles.webMapGlow} />
        <View style={styles.webGrid} />
        <View style={styles.webReferenceGrid} pointerEvents="none" />
        <View style={styles.webLatitudeGrid} pointerEvents="none" />
        <View style={styles.webLongitudeGrid} pointerEvents="none" />

        <View style={styles.webMiniZoom} pointerEvents="none">
          <View style={styles.webMiniZoomButton}>
            <Text style={styles.webMiniZoomText}>+</Text>
          </View>
          <View style={styles.webMiniZoomDivider} />
          <View style={styles.webMiniZoomButton}>
            <Text style={styles.webMiniZoomText}>−</Text>
          </View>
        </View>

        <View style={styles.webWorldProjection}>
          <View style={styles.webLandmassOne} />
          <View style={styles.webLandmassTwo} />
          <View style={styles.webLandmassThree} />
          <View style={styles.webLandmassFour} />
          <View style={styles.webLandmassFive} />
          <View style={styles.webLandmassSix} />
        </View>

        <View style={styles.webLatitudeLabels} pointerEvents="none">
          <Text style={styles.webAxisLabel}>90°</Text>
          <Text style={styles.webAxisLabel}>60°</Text>
          <Text style={styles.webAxisLabel}>30°</Text>
          <Text style={styles.webAxisLabel}>0°</Text>
          <Text style={styles.webAxisLabel}>-30°</Text>
          <Text style={styles.webAxisLabel}>-60°</Text>
        </View>

        <View style={styles.webLongitudeLabels} pointerEvents="none">
          <Text style={styles.webAxisLabel}>180°</Text>
          <Text style={styles.webAxisLabel}>90°</Text>
          <Text style={styles.webAxisLabel}>0°</Text>
          <Text style={styles.webAxisLabel}>-90°</Text>
          <Text style={styles.webAxisLabel}>-180°</Text>
        </View>

        {isRevealed && mapSize.width > 0 ? (
          <View style={[styles.webResultLine, lineStyle]} pointerEvents="none" />
        ) : null}

        {guessPosition && guessMarkerPosition ? (
          <View
            style={[styles.webMarker, guessMarkerPosition, { marginLeft: -14, marginTop: -14 }]}
            pointerEvents="none"
          >
            <View style={styles.webMarkerDot} />
          </View>
        ) : null}

        {answerPosition && answerMarkerPosition ? (
          <View
            style={[styles.webAnswerMarker, answerMarkerPosition, { marginLeft: -14, marginTop: -14 }]}
            pointerEvents="none"
          >
            <View style={styles.webAnswerMarkerDot} />
          </View>
        ) : null}

        {guessPosition ? (
          <View style={styles.webCoordinatesBox} pointerEvents="none">
            <Text style={styles.webCoordinatesText}>Lat: {guessPosition.latitude.toFixed(2)}°</Text>
            <Text style={styles.webCoordinatesText}>Lng: {guessPosition.longitude.toFixed(2)}°</Text>
          </View>
        ) : null}

        <Text style={styles.webHint}>
          {isRevealed ? 'Palpite e localização correta' : 'Clique para escolher um ponto'}
        </Text>
      </Pressable>
    );
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        latitude?: number;
        longitude?: number;
      };

      if (payload.type === 'mapTap' && typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
        onLocationPick({ latitude: payload.latitude, longitude: payload.longitude });
      }
    } catch (error) {
      console.warn('Mensagem do WebView inválida:', error);
    }
  };

  return (
    <WebView
      key={mapKey}
      originWhitelist={['*']}
      source={{ html: sourceHtml }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      style={styles.webview}
      scrollEnabled={false}
      allowsInlineMediaPlayback
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#dfeaf0'
  },
  webMap: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#0f2430',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  webMapGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1d4765',
    opacity: 0.8
  },
  webGrid: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
    opacity: 0.7
  },
  webReferenceGrid: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
    opacity: 0.9,
    transform: [{ scale: 1.15 }]
  },
  webLatitudeGrid: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      'linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.12) 48%, transparent 52%)',
    backgroundSize: '100% 20%',
    opacity: 0.9
  },
  webLongitudeGrid: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 48%, transparent 52%)',
    backgroundSize: '20% 100%',
    opacity: 0.9
  },
  webMiniZoom: {
    position: 'absolute',
    top: 14,
    right: 12,
    width: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 17, 22, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    zIndex: 3
  },
  webMiniZoomButton: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  webMiniZoomDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  webMiniZoomText: {
    color: '#f2fbff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18
  },
  webWorldProjection: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.98,
    zIndex: 1
  },
  webLandmassOne: {
    position: 'absolute',
    width: '60%',
    height: '25%',
    left: '8%',
    top: '16%',
    backgroundColor: '#8bbd66',
    borderRadius: 55,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.9,
    shadowColor: '#a5d37a',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  webLandmassTwo: {
    position: 'absolute',
    width: '48%',
    height: '18%',
    right: '6%',
    top: '18%',
    backgroundColor: '#7abb7d',
    borderRadius: 60,
    transform: [{ rotate: '18deg' }],
    opacity: 0.95
  },
  webLandmassThree: {
    position: 'absolute',
    width: '38%',
    height: '19%',
    left: '26%',
    bottom: '17%',
    backgroundColor: '#6ea96d',
    borderRadius: 60,
    transform: [{ rotate: '8deg' }],
    opacity: 0.9
  },
  webLandmassFour: {
    position: 'absolute',
    width: '18%',
    height: '16%',
    right: '18%',
    bottom: '15%',
    backgroundColor: '#7bc079',
    borderRadius: 40,
    opacity: 0.85
  },
  webLandmassFive: {
    position: 'absolute',
    width: '14%',
    height: '26%',
    left: '38%',
    top: '30%',
    backgroundColor: '#8ac77c',
    borderRadius: 50,
    transform: [{ rotate: '8deg' }],
    opacity: 0.85
  },
  webLandmassSix: {
    position: 'absolute',
    width: '22%',
    height: '18%',
    left: '52%',
    bottom: '20%',
    backgroundColor: '#7bbd75',
    borderRadius: 42,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.82
  },
  webLatitudeLabels: {
    position: 'absolute',
    left: 10,
    top: 70,
    bottom: 70,
    justifyContent: 'space-between',
    zIndex: 2
  },
  webLongitudeLabels: {
    position: 'absolute',
    left: 36,
    right: 42,
    top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2
  },
  webAxisLabel: {
    color: 'rgba(227, 246, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4
  },
  webMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 115, 115, 0.15)',
    zIndex: 4
  },
  webMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#ff6b6b',
    borderWidth: 3,
    borderColor: '#fff'
  },
  webAnswerMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(34, 181, 115, 0.18)',
    zIndex: 4
  },
  webAnswerMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#22b573',
    borderWidth: 3,
    borderColor: '#fff'
  },
  webResultLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f5c451',
    zIndex: 3
  },
  webCoordinatesBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(6, 22, 31, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 5
  },
  webCoordinatesText: {
    color: '#eaf9ff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16
  },
  webHint: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(6, 22, 31, 0.75)',
    color: '#eaf9ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700'
  }
});
