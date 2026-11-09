import * as Network from 'expo-network';

import { Location } from '../types/game';

// Localidades locais de fallback para garantir que o jogo continue funcionando mesmo sem conexão.
export const fallbackLocations: Location[] = [
  {
    id: 'tokyo',
    label: 'Tóquio, Japão',
    latitude: 35.6762,
    longitude: 139.6503,
    imageUrl:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'paris',
    label: 'Paris, França',
    latitude: 48.8566,
    longitude: 2.3522,
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'new-york',
    label: 'Nova Iorque, EUA',
    latitude: 40.7128,
    longitude: -74.006,
    imageUrl:
      'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'rio',
    label: 'Rio de Janeiro, Brasil',
    latitude: -22.9068,
    longitude: -43.1729,
    imageUrl:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'rome',
    label: 'Roma, Itália',
    latitude: 41.9028,
    longitude: 12.4964,
    imageUrl:
      'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'sydney',
    label: 'Sydney, Austrália',
    latitude: -33.8688,
    longitude: 151.2093,
    imageUrl:
      'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80'
  }
];

const remoteSourceUrl =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

// Estrutura simples para aceitar formatos de API ou JSON em bruto.
function isLocationCandidate(value: unknown): value is Partial<Location> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    typeof candidate.imageUrl === 'string'
  );
}

function normalizeLocation(raw: unknown): Location | null {
  if (!isLocationCandidate(raw)) {
    return null;
  }

  const candidate = raw as Partial<Location> & Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.label !== 'string' ||
    typeof candidate.latitude !== 'number' ||
    typeof candidate.longitude !== 'number' ||
    typeof candidate.imageUrl !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    label: candidate.label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    imageUrl: candidate.imageUrl
  };
}

function flattenCoordinates(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const flat: number[] = [];

  for (const item of value) {
    if (Array.isArray(item)) {
      flat.push(...flattenCoordinates(item));
      continue;
    }

    if (typeof item === 'number') {
      flat.push(item);
    }
  }

  return flat;
}

function geometryToCentroid(geometry: unknown): { latitude: number; longitude: number } | null {
  if (!geometry || typeof geometry !== 'object') {
    return null;
  }

  const shape = geometry as Record<string, unknown>;

  if (shape.type === 'Point' && Array.isArray(shape.coordinates) && shape.coordinates.length >= 2) {
    const [longitude, latitude] = shape.coordinates as [number, number];
    return { latitude, longitude };
  }

  const coordinates = shape.coordinates as unknown;
  const flattened = flattenCoordinates(coordinates);

  if (flattened.length < 2) {
    return null;
  }

  let longitudeTotal = 0;
  let latitudeTotal = 0;
  let count = 0;

  for (let index = 0; index < flattened.length - 1; index += 2) {
    const lng = flattened[index];
    const lat = flattened[index + 1];

    if (typeof lng === 'number' && typeof lat === 'number') {
      longitudeTotal += lng;
      latitudeTotal += lat;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    latitude: latitudeTotal / count,
    longitude: longitudeTotal / count
  };
}

function featureToLocation(feature: unknown): Location | null {
  if (!feature || typeof feature !== 'object') {
    return null;
  }

  const item = feature as Record<string, unknown>;
  const properties = (item.properties as Record<string, unknown>) ?? {};
  const geometry = item.geometry as unknown;
  const centroid = geometryToCentroid(geometry);

  if (!centroid) {
    return null;
  }

  const label =
    (typeof properties.name === 'string' && properties.name) ||
    (typeof properties.ADMIN === 'string' && properties.ADMIN) ||
    (typeof properties.name_en === 'string' && properties.name_en) ||
    'Local geográfico';

  return {
    id: `geo-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    imageUrl:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80'
  };
}

// Gera uma lista dinâmica e praticamente infinita de locais válidos para quando há internet.
export function generateDynamicLocations(count: number): Location[] {
  const dynamicSeeds = [
    { id: 'london', label: 'Londres, Reino Unido', latitude: 51.5072, longitude: -0.1276, imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80' },
    { id: 'berlin', label: 'Berlim, Alemanha', latitude: 52.52, longitude: 13.405, imageUrl: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80' },
    { id: 'dubai', label: 'Dubai, Emirados Árabes', latitude: 25.2048, longitude: 55.2708, imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80' },
    { id: 'mexico-city', label: 'Cidade do México, México', latitude: 19.4326, longitude: -99.1332, imageUrl: 'https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?auto=format&fit=crop&w=1200&q=80' },
    { id: 'indianapolis', label: 'Indianápolis, EUA', latitude: 39.7684, longitude: -86.1581, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'cape-town', label: 'Cidade do Cabo, África do Sul', latitude: -33.9249, longitude: 18.4241, imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80' },
    { id: 'bangkok', label: 'Banguecoque, Tailândia', latitude: 13.7563, longitude: 100.5018, imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80' },
    { id: 'madrid', label: 'Madrid, Espanha', latitude: 40.4168, longitude: -3.7038, imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80' }
  ];

  const list: Location[] = [...dynamicSeeds];

  for (let index = 0; index < count; index += 1) {
    const angle = index * 31.7;
    const latitude = Number(((Math.sin(angle) * 45 + 0.5 * 55) % 90).toFixed(4));
    const longitude = Number(((Math.cos(angle) * 120 + 0.5 * 180) % 180).toFixed(4));

    list.push({
      id: `dynamic-${index}-${Math.round(latitude * 1000)}`,
      label: `Local Dinâmico ${index + 1}`,
      latitude: latitude - 90 * (Math.abs(Math.sin(angle)) % 2 > 1 ? 1 : 0),
      longitude: longitude - 180 * (Math.abs(Math.cos(angle)) % 2 > 1 ? 1 : 0),
      imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80'
    });
  }

  return list.slice(0, Math.max(count, 8));
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return Boolean(networkState.isConnected && networkState.isInternetReachable);
  } catch (error) {
    console.warn('Falha ao verificar a conexão:', error);
    return false;
  }
}

export function pickUniqueRandomLocation(candidates: Location[], previousIds: string[] = []): Location {
  const allowed = candidates.filter((candidate) => !previousIds.includes(candidate.id));
  const source = allowed.length > 0 ? allowed : candidates;
  return source[Math.floor(Math.random() * source.length)];
}

async function fetchRemoteLocations(): Promise<Location[]> {
  const response = await fetch(remoteSourceUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Falha na requisição remota: ${response.status}`);
  }

  const payload = await response.json();

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.locations)
      ? payload.locations
      : Array.isArray(payload.countries)
        ? payload.countries
        : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.features)
            ? payload.features
            : [];

  const normalized = (rawList as unknown[])
    .map((item: unknown) => {
      if (typeof item === 'object' && item !== null && 'geometry' in item) {
        return featureToLocation(item);
      }

      return normalizeLocation(item);
    })
    .filter((item): item is Location => item !== null);

  if (normalized.length === 0) {
    throw new Error('A lista remota não retornou localidades válidas.');
  }

  return normalized;
}

export async function fetchRandomOnlineLocation(previousIds: string[] = []): Promise<Location | null> {
  const isOnline = await checkConnectivity();

  if (!isOnline) {
    return null;
  }

  try {
    const remoteLocations = await fetchRemoteLocations();
    return pickUniqueRandomLocation(remoteLocations, previousIds);
  } catch (error) {
    console.warn('Erro ao buscar localidades remotas, a fallback dinâmica será usada:', error);

    try {
      const generated = generateDynamicLocations(20);
      return pickUniqueRandomLocation(generated, previousIds);
    } catch (dynamicError) {
      console.warn('Fallback dinâmica falhou também:', dynamicError);
      return null;
    }
  }
}

export async function getNextLocation(previousIds: string[] = []): Promise<Location> {
  const onlineLocation = await fetchRandomOnlineLocation(previousIds);

  if (onlineLocation) {
    return onlineLocation;
  }

  return pickUniqueRandomLocation(fallbackLocations, previousIds);
}

export async function buildRoundSequence(roundCount: number, previousIds: string[] = []): Promise<Location[]> {
  const sequence: Location[] = [];
  const usedIds = [...previousIds];

  for (let index = 0; index < roundCount; index += 1) {
    const nextLocation = await getNextLocation(usedIds);
    sequence.push(nextLocation);
    usedIds.push(nextLocation.id);
  }

  return sequence;
}
