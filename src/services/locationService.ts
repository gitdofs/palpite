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

// Locais com imagens próprias para manter a pista visual coerente com o destino.
export function generateDynamicLocations(count: number): Location[] {
  const dynamicSeeds = [
    { id: 'london', label: 'Londres, Reino Unido', latitude: 51.5072, longitude: -0.1276, imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80' },
    { id: 'berlin', label: 'Berlim, Alemanha', latitude: 52.52, longitude: 13.405, imageUrl: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80' },
    { id: 'dubai', label: 'Dubai, Emirados Árabes', latitude: 25.2048, longitude: 55.2708, imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80' },
    { id: 'mexico-city', label: 'Cidade do México, México', latitude: 19.4326, longitude: -99.1332, imageUrl: 'https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?auto=format&fit=crop&w=1200&q=80' },
    { id: 'cape-town', label: 'Cidade do Cabo, África do Sul', latitude: -33.9249, longitude: 18.4241, imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80' },
    { id: 'bangkok', label: 'Banguecoque, Tailândia', latitude: 13.7563, longitude: 100.5018, imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80' },
    { id: 'madrid', label: 'Madrid, Espanha', latitude: 40.4168, longitude: -3.7038, imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80' },
    { id: 'seoul', label: 'Seul, Coreia do Sul', latitude: 37.5665, longitude: 126.978, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'singapore', label: 'Singapura', latitude: 1.3521, longitude: 103.8198, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'mumbai', label: 'Mumbai, Índia', latitude: 19.076, longitude: 72.8777, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'cairo', label: 'Cairo, Egito', latitude: 30.0444, longitude: 31.2357, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'istanbul', label: 'Istambul, Turquia', latitude: 41.0082, longitude: 28.9784, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'buenos-aires', label: 'Buenos Aires, Argentina', latitude: -34.6037, longitude: -58.3816, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'lima', label: 'Lima, Peru', latitude: -12.0464, longitude: -77.0428, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'santiago', label: 'Santiago, Chile', latitude: -33.4489, longitude: -70.6693, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'toronto', label: 'Toronto, Canadá', latitude: 43.6532, longitude: -79.3832, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'vancouver', label: 'Vancouver, Canadá', latitude: 49.2827, longitude: -123.1207, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'san-francisco', label: 'São Francisco, EUA', latitude: 37.7749, longitude: -122.4194, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'los-angeles', label: 'Los Angeles, EUA', latitude: 34.0522, longitude: -118.2437, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'reykjavik', label: 'Reiquiavique, Islândia', latitude: 64.1466, longitude: -21.9426, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'stockholm', label: 'Estocolmo, Suécia', latitude: 59.3293, longitude: 18.0686, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'amsterdam', label: 'Amsterdã, Países Baixos', latitude: 52.3676, longitude: 4.9041, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'prague', label: 'Praga, Tchéquia', latitude: 50.0755, longitude: 14.4378, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'lisbon', label: 'Lisboa, Portugal', latitude: 38.7223, longitude: -9.1393, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'athens', label: 'Atenas, Grécia', latitude: 37.9838, longitude: 23.7275, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'nairobi', label: 'Nairóbi, Quênia', latitude: -1.2921, longitude: 36.8219, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'marrakech', label: 'Marraquexe, Marrocos', latitude: 31.6295, longitude: -7.9811, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'lagos', label: 'Lagos, Nigéria', latitude: 6.5244, longitude: 3.3792, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'jakarta', label: 'Jacarta, Indonésia', latitude: -6.2088, longitude: 106.8456, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'hanoi', label: 'Hanói, Vietnã', latitude: 21.0278, longitude: 105.8342, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'auckland', label: 'Auckland, Nova Zelândia', latitude: -36.8509, longitude: 174.7645, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'manila', label: 'Manila, Filipinas', latitude: 14.5995, longitude: 120.9842, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'kyoto', label: 'Quioto, Japão', latitude: 35.0116, longitude: 135.7681, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'beijing', label: 'Pequim, China', latitude: 39.9042, longitude: 116.4074, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'shanghai', label: 'Xangai, China', latitude: 31.2304, longitude: 121.4737, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'doha', label: 'Doha, Catar', latitude: 25.2854, longitude: 51.531, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'kathmandu', label: 'Catmandu, Nepal', latitude: 27.7172, longitude: 85.324, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'bogota', label: 'Bogotá, Colômbia', latitude: 4.711, longitude: -74.0721, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'medellin', label: 'Medellín, Colômbia', latitude: 6.2442, longitude: -75.5812, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'montevideo', label: 'Montevidéu, Uruguai', latitude: -34.9011, longitude: -56.1645, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'havana', label: 'Havana, Cuba', latitude: 23.1136, longitude: -82.3666, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' }
  ];

  return dynamicSeeds.slice(0, Math.max(count, 0));
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

  if (allowed.length === 0) {
    throw new Error('Não há cidades inéditas disponíveis nesta sessão.');
  }

  return allowed[Math.floor(Math.random() * allowed.length)];
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
  const locationsWithImages = [...fallbackLocations, ...generateDynamicLocations(50)];
  return pickUniqueRandomLocation(locationsWithImages, previousIds);
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
