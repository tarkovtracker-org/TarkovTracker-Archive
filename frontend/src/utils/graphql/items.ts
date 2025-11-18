export const itemDataFragment = /* GraphQL */ `
  fragment ItemData on Item {
    id
    shortName
    name
    link
    wikiLink
    image512pxLink
    gridImageLink
    baseImageLink
    iconLink
    image8xLink
    backgroundColor
  }
`;

export const categoryDataFragment = /* GraphQL */ `
  fragment CategoryData on ItemCategory {
    id
    name
    normalizedName
  }
`;

export const itemPropertiesFragment = /* GraphQL */ `
  fragment ItemProperties on ItemProperties {
    width
    height
    weight
    basePrice
    avg24hPrice
    avg7daysPrice
    updated
    slots
    diffLast48
    diffLast7days
    changeLast48h
    changeLast7days
    low24hPrice
    low7daysPrice
    traderPrice
    traderPriceCurrency
    traderName
    iconLink
    sellFor {
      source
      price
      currency
    }
    buyFor {
      source
      price
      currency
    }
  }
`;

export const itemWithPropertiesFragment = /* GraphQL */ `
  fragment ItemWithProperties on Item {
    ...ItemData
    category {
      ...CategoryData
    }
    properties {
      ...ItemProperties
    }
  }
`;

export const ammunitionFragment = /* GraphQL */ `
  fragment AmmunitionData on Ammunition {
    item {
      ...ItemData
    }
    caliber
    damage
    penetrationPower
    armorDamage
    fragmentationChance
    ricochetChance
    speed
    lightBleedChance
    heavyBleedChance
    staminaBurnPerDamage
  }
`;

export const ammoPackFragment = /* GraphQL */ `
  fragment AmmoPackData on AmmoPack {
    item {
      ...ItemData
    }
    ammoCount
    rounds
  }
`;

export const armorFragment = /* GraphQL */ `
  fragment ArmorData on Armor {
    item {
      ...ItemData
    }
    armorClass
    durability
    repairCost
    speedPenalty
    turnPenalty
    ergoPenalty
    zones
  }
`;

export const medicalFragment = /* GraphQL */ `
  fragment MedicalData on Medical {
    item {
      ...ItemData
    }
    uses
    cures {
      effects
      bodyParts
    }
    removesNegativeEffects
    curesNegativeEffects
    treatmentTime
    healthImpact {
      bodyPart
      health
      painkillerDuration
      resourcesCost
      healthPenalty
    }
  }
`;

export const provisionsFragment = /* GraphQL */ `
  fragment ProvisionsData on Provisions {
    item {
      ...ItemData
    }
    buffs
    weight
    useTime
    effects {
      effect
      bodyParts
      duration
      delay
      chance
      energy
      hydration
      damage
    }
    stashConsumptionTime
  }
`;

export const gearFragment = /* GraphQL */ `
  fragment GearData on Gear {
    item {
      ...ItemData
    }
    classType
    durability
    repairCost
    speedPenalty
    turnPenalty
    ergoPenalty
    penalties {
      ergo
      speed
      mouse
      recoil
    }
    slots {
      slots
      filters {
        type
        allowedCategories
      }
    }
    armorClass
    armorZones
    material {
      name
      normalizedName
      id
      sortOrder
    }
    ricochet
    defaultHeight
    defaultWidth
  }
`;

export const primaryWeaponsFragment = /* GraphQL */ `
  fragment PrimaryWeaponsData on PrimaryWeapon {
    item {
      ...ItemData
    }
    calibers {
      caliber
    }
    fireModes {
      mode
    }
    ergonomics
    recoilVertical
    recoilHorizontal
    weight
    defaultWidth
    defaultHeight
    centerOfImpact
    magazineCapacity
    defaultPreset {
      item {
        ...ItemData
      }
      name
      encyclopedia
    }
    presetTypes {
      presetType
      presets {
        item {
          ...ItemData
        }
        name
        encyclopedia
        compatibility
      }
    }
    defaultAmmo {
      item {
        ...ItemData
      }
    }
    effectiveDistance
    sightingRange
    modes {
      mode
      burstRate
    }
    recoilForce
    recoilAngle
    convergence
    cameraRecoil
    cameraSnap
    handDamping
    returnSpeed
    dispersions {
      isAiming
      value
    }
    camDispersion
    camDispersionInc
    deviation
    deviationMax
    deviationMaxHip
    recoilDispersion
    recoilDispersionInc
    recoilVerticall
  }
`;

export const weaponModsFragment = /* GraphQL */ `
  fragment WeaponModsData on WeaponMod {
    item {
      ...ItemData
    }
    type {
      name
      normalizedName
    }
    compatibility {
      item {
        ...ItemData
      }
      id
      name
      type
    }
    slots {
      slots
      filters {
        type
        allowedCategories
      }
    }
    properties {
      recoilVertical
      recoilHorizontal
      ergonomics
      weight
      centerOfImpact
      dispersion
      durability
      repairCost
      laserSight
      flashlight
      ammo
      caliber
      damage
      penetrationPower
      armorDamage
      fragmentationChance
      ricochetChance
      speed
      lightBleedChance
      heavyBleedChance
      staminaBurnPerDamage
      modes {
        mode
        burstRate
      }
    }
  }
`;
