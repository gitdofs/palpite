import { Location } from '../types/game';

// Localizações de exemplo do mundo real para testar a mecânica do jogo.
export const locations: Location[] = [
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
  }
];
