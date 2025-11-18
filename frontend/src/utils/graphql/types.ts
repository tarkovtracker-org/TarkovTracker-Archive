// Type definitions for GraphQL fragments and queries
// These provide TypeScript interfaces that match the GraphQL schema

export interface ItemData {
  id: string;
  shortName: string;
  name: string;
  link: string;
  wikiLink: string;
  image512pxLink: string;
  gridImageLink: string;
  baseImageLink: string;
  iconLink: string;
  image8xLink: string;
  backgroundColor: string;
}

export interface CategoryData {
  id: string;
  name: string;
  normalizedName: string;
}

export interface MapPositionData {
  x: number;
  y: number;
  z: number;
}

export interface MapWithPositionsData {
  map: {
    id: string;
  };
  positions: MapPositionData[];
}

export interface TaskZoneData {
  id: string;
  map: {
    id: string;
  };
  position: MapPositionData;
  outline: MapPositionData;
  top: number;
  bottom: number;
}

export interface TaskObjectiveData {
  id: string;
  description: string;
  type: {
    id: string;
    name: string;
    normalizedName: string;
  };
  targetItem?: ItemData & {
    category?: CategoryData;
  };
  targetTrader?: {
    id: string;
    name: string;
  };
  targetLevel?: number;
  targetCount?: number;
  zones: TaskZoneData[];
  maps: MapWithPositionsData[];
  alternatives: TaskObjectiveData[];
}

export interface TaskData {
  id: string;
  tarkovDataId: string;
  name: string;
  description: string;
  trader: {
    id: string;
    name: string;
  };
  location: string;
  type: {
    id: string;
    name: string;
    normalizedName: string;
  };
  experience: number;
  wikiLink: string;
  minPlayerLevel: number;
  objectives: TaskObjectiveData[];
  taskRequirements: {
    task: {
      id: string;
      name: string;
    };
    status: string;
  }[];
  factionName: string;
  restartable: boolean;
  objectivesImageLink: string;
  neededKeys: ItemData[];
  failConditions: string;
  alternatives: {
    id: string;
  }[];
}

export interface ItemProperties {
  width: number;
  height: number;
  weight: number;
  basePrice: number;
  avg24hPrice: number;
  avg7daysPrice: number;
  updated: string;
  slots: number;
  diffLast48: number;
  diffLast7days: number;
  changeLast48h: number;
  changeLast7days: number;
  low24hPrice: number;
  low7daysPrice: number;
  traderPrice: number;
  traderPriceCurrency: string;
  traderName: string;
  iconLink: string;
  sellFor: {
    source: string;
    price: number;
    currency: string;
  }[];
  buyFor: {
    source: string;
    price: number;
    currency: string;
  }[];
}

export interface ItemWithProperties extends ItemData {
  category?: CategoryData;
  properties: ItemProperties;
}

export interface AmmunitionData {
  item: ItemData;
  caliber: string;
  damage: number;
  penetrationPower: number;
  armorDamage: number;
  fragmentationChance: number;
  ricochetChance: number;
  speed: number;
  lightBleedChance: number;
  heavyBleedChance: number;
  staminaBurnPerDamage: number;
}

export interface AmmoPackData {
  item: ItemData;
  ammoCount: number;
  rounds: number;
}

export interface ArmorData {
  item: ItemData;
  armorClass: number;
  durability: number;
  repairCost: number;
  speedPenalty: number;
  turnPenalty: number;
  ergoPenalty: number;
  zones: string[];
}

export interface MedicalData {
  item: ItemData;
  uses: number;
  cures: {
    effects: string[];
    bodyParts: string[];
  }[];
  removesNegativeEffects: string[];
  curesNegativeEffects: string[];
  treatmentTime: number;
  healthImpact: {
    bodyPart: string;
    health: number;
    painkillerDuration: number;
    resourcesCost: number;
    healthPenalty: number;
  }[];
}

export interface ProvisionsData {
  item: ItemData;
  buffs: string[];
  weight: number;
  useTime: number;
  effects: {
    effect: string;
    bodyParts: string[];
    duration: number;
    delay: number;
    chance: number;
    energy: number;
    hydration: number;
    damage: number;
  }[];
  stashConsumptionTime: number;
}

export interface GearData {
  item: ItemData;
  classType: string;
  durability: number;
  repairCost: number;
  speedPenalty: number;
  turnPenalty: number;
  ergoPenalty: number;
  penalties: {
    ergo: number;
    speed: number;
    mouse: number;
    recoil: number;
  };
  slots: {
    slots: number;
    filters: {
      type: string;
      allowedCategories: string[];
    }[];
  }[];
  armorClass?: number;
  armorZones?: string[];
  material?: {
    name: string;
    normalizedName: string;
    id: string;
    sortOrder: number;
  };
  ricochet?: boolean;
  defaultHeight?: number;
  defaultWidth?: number;
}

export interface HideoutModuleData {
  id: string;
  name: string;
  levels: {
    id: string;
    level: number;
    itemRequirements: {
      id: string;
      item: ItemData;
      count: number;
    }[];
    stationLevelRequirements: {
      level: number;
      station: {
        id: string;
        name: string;
      };
    }[];
    skillRequirements: {
      level: number;
      name: string;
    }[];
    traderRequirements: {
      level: number;
      trader: {
        id: string;
        name: string;
      };
    }[];
  }[];
}

export interface CraftData {
  id: string;
  stationId: string;
  level: number;
  duration: number;
  requirements: {
    item: ItemData;
    count: number;
    type: string;
  }[];
  rewardItems: {
    item: ItemData;
    count: number;
  }[];
}

export interface TraderData {
  id: string;
  name: string;
  currency: string;
  resetTime: number;
  imageLink: string;
  avatarLink: string;
  reputationLevels: {
    level: number;
    requiredReputation: number;
    requiredPlayerLevel: number;
    unlocked: boolean;
  }[];
}

export interface BarterData {
  id: string;
  trader: {
    id: string;
    name: string;
  };
  level: number;
  taskUnlock?: {
    id: string;
    name: string;
  };
  requireItems: {
    item: ItemData;
    count: number;
  }[];
  rewardItems: {
    item: ItemData;
    count: number;
  }[];
  source: string;
  usedInItems: ItemData[];
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  normalizedName: string;
  version: string;
  wiki: string;
  players: string;
  raidDuration: number;
  exitChanges: string;
  insurance: boolean;
  bosses: string[];
  scavRaids: boolean;
  enemies: string[];
  keys: ItemData[];
  stationaryWeapons: string[];
}

export interface PresetData {
  id: string;
  item: ItemData;
  name: string;
  baseItem: ItemData;
  encyclopedia: string;
  parts: {
    item: ItemData;
    quantity: number;
  }[];
  slots: {
    item: ItemData;
    name: string;
    position: {
      x: number;
      y: number;
      r: number;
      width: number;
      height: number;
    };
    contains: {
      item: ItemData;
      quantity: number;
    }[];
  }[];
}

export interface PrimaryWeaponsData {
  item: ItemData;
  calibers: {
    caliber: string;
  }[];
  fireModes: {
    mode: string;
  }[];
  ergonomics: number;
  recoilVertical: number;
  recoilHorizontal: number;
  weight: number;
  defaultWidth: number;
  defaultHeight: number;
  centerOfImpact: number;
  magazineCapacity: number;
  defaultPreset: {
    item: ItemData;
    name: string;
    encyclopedia: string;
  };
  presetTypes: {
    presetType: string;
    presets: {
      item: ItemData;
      name: string;
      encyclopedia: string;
      compatibility: string;
    }[];
  }[];
  defaultAmmo: {
    item: ItemData;
  };
  effectiveDistance: number;
  sightingRange: number;
  modes: {
    mode: string;
    burstRate: number;
  }[];
  recoilForce: number;
  recoilAngle: number;
  convergence: number;
  cameraRecoil: {
    cameraSnap: number;
    handDamping: number;
    returnSpeed: number;
    dispersions: {
      isAiming: boolean;
      value: number;
    }[];
    camDispersion: number;
    camDispersionInc: number;
    deviation: number;
    deviationMax: number;
    deviationMaxHip: number;
    recoilDispersion: number;
    recoilDispersionInc: number;
    recoilVerticall: number;
  };
}

export interface WeaponModsData {
  item: ItemData;
  type: {
    name: string;
    normalizedName: string;
  };
  compatibility: {
    item: ItemData;
    id: string;
    name: string;
    type: string;
  }[];
  slots: {
    slots: number;
    filters: {
      type: string;
      allowedCategories: string[];
    }[];
  }[];
  properties: {
    recoilVertical?: number;
    recoilHorizontal?: number;
    ergonomics?: number;
    weight?: number;
    centerOfImpact?: number;
    dispersion?: number;
    durability?: number;
    repairCost?: number;
    laserSight?: boolean;
    flashlight?: boolean;
    ammo?: number;
    caliber?: string;
    damage?: number;
    penetrationPower?: number;
    armorDamage?: number;
    fragmentationChance?: number;
    ricochetChance?: number;
    speed?: number;
    lightBleedChance?: number;
    heavyBleedChance?: number;
    staminaBurnPerDamage?: number;
    modes?: {
      mode: string;
      burstRate: number;
    }[];
  };
}

// Main query result type
export interface TarkovDataQueryResult {
  tasks: TaskData[];
  hideoutModules: HideoutModuleData[];
  traders: TraderData[];
  maps: MapData[];
  items: ItemWithProperties[];
  hideoutItems: ItemData[];
  crafts: CraftData[];
  barters: BarterData[];
  presets: PresetData[];
  ammunition: AmmunitionData[];
  ammoPacks: AmmoPackData[];
  armor: ArmorData[];
  medical: MedicalData[];
  primaryWeapons: PrimaryWeaponsData[];
  mapsItems: ItemData[];
  provisions: ProvisionsData[];
  gear: GearData[];
  throwables: ItemData[];
  weaponMods: WeaponModsData[];
}

// GraphQL variables
export interface TarkovDataVariables {
  lang: string;
  gameMode: string;
}
