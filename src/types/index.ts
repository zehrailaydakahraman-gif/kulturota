export type Coordinates = [number, number];

export interface Place {
  name: string;
  district?: string;
  address: string;
  phone: string;
  hours: string;
  mediaUrl?: string;
  type: string;
  isLibrary: boolean;
  coords: Coordinates | null;
}

export interface RawPlaceRow {
  [key: string]: string;
}

export type FilterType = 'all' | 'museum' | 'library';
