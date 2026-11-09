// Definições centrais do modelo do jogo para manter a lógica separada da UI.
export interface Location {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
}

export interface GuessPosition {
  latitude: number;
  longitude: number;
}

export interface RoundResult {
  distanceKm: number;
  points: number;
}
