export interface MapCoordinate {
  x: number;
  z: number;
}

export interface MapReference {
  id: string;
}

export interface MapZone {
  map: MapReference;
  outline: MapCoordinate[];
}

export interface MapLocation {
  map: MapReference;
  positions: MapCoordinate[];
}

export interface ObjectiveMarker {
  id?: string;
  users: string[];
  zones?: MapZone[];
  possibleLocations?: MapLocation[];
}

export interface MapSvgDefinition {
  file: string;
  floors: string[];
  defaultFloor: string;
  coordinateRotation: number;
  bounds: number[][];
}
