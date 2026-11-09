import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { GuessPosition } from '../types/game';

interface MapPickerProps {
  onLocationPick: (guess: GuessPosition) => void;
  mapKey: string;
}

export function MapPicker({ onLocationPick, mapKey }: MapPickerProps) {
  // Gera o HTML do mapa usando Leaflet via CDN, mantendo a lógica em um pedaço isolado.
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
  }
});
