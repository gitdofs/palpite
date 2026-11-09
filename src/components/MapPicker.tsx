import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { GuessPosition } from '../types/game';

interface MapPickerProps {
  onLocationPick: (guess: GuessPosition) => void;
  mapKey: string;
}

export function MapPicker({ onLocationPick, mapKey }: MapPickerProps) {
  const isWeb = Platform.OS === 'web';
  const [webGuess, setWebGuess] = useState<GuessPosition>({ latitude: 0, longitude: 0 });

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

      setWebGuess(nextGuess);
      onLocationPick(nextGuess);
    };

    const markerLeft = `${((webGuess.longitude + 180) / 360) * 100}%`;
    const markerTop = `${((90 - webGuess.latitude) / 180) * 100}%`;

    return (
      <Pressable style={styles.webMap} onPress={handleWebTap}>
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

        <View
          style={[styles.webMarker, { left: markerLeft, top: markerTop, marginLeft: -14, marginTop: -14 }]}
          pointerEvents="none"
        >
          <View style={styles.webMarkerDot} />
        </View>

        <View style={styles.webCoordinatesBox} pointerEvents="none">
          <Text style={styles.webCoordinatesText}>Lat: {webGuess.latitude.toFixed(2)}°</Text>
          <Text style={styles.webCoordinatesText}>Lng: {webGuess.longitude.toFixed(2)}°</Text>
        </View>

        <Text style={styles.webHint}>Clique para escolher um ponto</Text>
      </Pressable>
    );
  }

  // Gera o HTML do mapa usando Leaflet via CDN no ambiente nativo móvel.
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
              attributionControl: false,
              worldCopyJump: true
            }).setView([20, 0], 2);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 18,
              minZoom: 2
            }).addTo(map);

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
          </script>
        </body>
      </html>
    `;
  }, []);

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
