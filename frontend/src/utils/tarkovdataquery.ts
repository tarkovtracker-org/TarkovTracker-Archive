import gql from 'graphql-tag';
export default gql`
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
  fragment CategoryData on ItemCategory {
    id
    name
    normalizedName
  }
  fragment MapPositionData on MapPosition {
    x
    y
    z
  }
  fragment MapWithPositionsData on MapWithPosition {
    map {
      id
    }
    positions {
      ...MapPositionData
    }
  }
  fragment TaskZoneData on TaskZone {
    id
    map {
      id
    }
    position {
      ...MapPositionData
    }
    outline {
      ...MapPositionData
    }
    top
    bottom
  }
  query TarkovData($lang: LanguageCode, $gameMode: GameMode) {
    tasks(lang: $lang, gameMode: $gameMode) {
      id
      tarkovDataId
      name
      trader {
        id
        name
        imageLink
      }
      map {
        id
        name
      }
      kappaRequired
      lightkeeperRequired
      experience
      wikiLink
      taskImageLink
      minPlayerLevel
      normalizedName
      availableDelaySecondsMin
      availableDelaySecondsMax
      restartable
      descriptionMessageId
      startMessageId
      successMessageId
      failMessageId
      taskRequirements {
        task {
          id
          name
        }
        status
      }
      traderRequirements {
        trader {
          id
          name
        }
        value
      }
      objectives {
        id
        description
        type
        maps {
          id
          name
        }
        optional
        __typename
        ... on TaskObjectiveBasic {
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectiveBuildItem {
          item {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          containsAll {
            ...ItemData
          }
          containsCategory {
            ...CategoryData
            parent {
              ...CategoryData
            }
            children {
              ...CategoryData
            }
          }
          attributes {
            name
            requirement {
              compareMethod
              value
            }
          }
        }
        ... on TaskObjectiveExperience {
          healthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
        }
        ... on TaskObjectiveExtract {
          exitStatus
          zoneNames
        }
        ... on TaskObjectiveItem {
          zones {
            ...TaskZoneData
          }
          items {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          count
          foundInRaid
          dogTagLevel
          maxDurability
          minDurability
        }
        ... on TaskObjectiveMark {
          markerItem {
            ...ItemData
          }
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectivePlayerLevel {
          playerLevel
        }
        ... on TaskObjectiveQuestItem {
          possibleLocations {
            ...MapWithPositionsData
          }
          zones {
            ...TaskZoneData
          }
          questItem {
            id
            name
          }
          count
        }
        ... on TaskObjectiveShoot {
          shotType
          targetNames
          count
          zoneNames
          bodyParts
          usingWeapon {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          usingWeaponMods {
            ...ItemData
          }
          wearing {
            ...ItemData
          }
          notWearing {
            ...ItemData
          }
          distance {
            compareMethod
            value
          }
          playerHealthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
          enemyHealthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectiveSkill {
          skillLevel {
            name
            level
          }
        }
        ... on TaskObjectiveTaskStatus {
          task {
            id
            name
          }
          status
        }
        ... on TaskObjectiveTraderLevel {
          trader {
            id
            name
          }
          level
        }
        ... on TaskObjectiveUseItem {
          useAny {
            ...ItemData
          }
          zones {
            ...TaskZoneData
          }
          count
        }
        ... on TaskObjectiveTraderStanding {
          trader {
            id
            name
          }
          compareMethod
          value
        }
      }
      startRewards {
        traderStanding {
          trader {
            id
            name
          }
          standing
        }
        items {
          count
          item {
            ...ItemData
            containsItems {
              item {
                ...ItemData
              }
              count
            }
          }
        }
        offerUnlock {
          id
          trader {
            id
            name
          }
          level
          item {
            ...ItemData
            containsItems {
              count
              item {
                ...ItemData
              }
            }
          }
        }
        skillLevelReward {
          name
          level
        }
        traderUnlock {
          id
          name
        }
        craftUnlock {
          id
        }
      }
      finishRewards {
        traderStanding {
          trader {
            id
            name
          }
          standing
        }
        items {
          count
          item {
            ...ItemData
            containsItems {
              item {
                ...ItemData
              }
              count
            }
          }
        }
        offerUnlock {
          id
          trader {
            id
            name
          }
          level
          item {
            ...ItemData
            containsItems {
              count
              item {
                ...ItemData
              }
            }
          }
        }
        skillLevelReward {
          name
          level
        }
        traderUnlock {
          id
          name
        }
        craftUnlock {
          id
        }
      }
      failConditions {
        id
        description
        type
        maps {
          id
          name
        }
        optional
        __typename
        ... on TaskObjectiveBasic {
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectiveBuildItem {
          item {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          containsAll {
            ...ItemData
          }
          containsCategory {
            ...CategoryData
            parent {
              ...CategoryData
            }
            children {
              ...CategoryData
            }
          }
          attributes {
            name
            requirement {
              compareMethod
              value
            }
          }
        }
        ... on TaskObjectiveExperience {
          healthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
        }
        ... on TaskObjectiveExtract {
          exitStatus
          zoneNames
        }
        ... on TaskObjectiveItem {
          zones {
            ...TaskZoneData
          }
          items {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          count
          foundInRaid
          dogTagLevel
          maxDurability
          minDurability
        }
        ... on TaskObjectiveMark {
          markerItem {
            ...ItemData
          }
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectivePlayerLevel {
          playerLevel
        }
        ... on TaskObjectiveQuestItem {
          possibleLocations {
            ...MapWithPositionsData
          }
          zones {
            ...TaskZoneData
          }
          questItem {
            id
            name
          }
          count
        }
        ... on TaskObjectiveShoot {
          shotType
          targetNames
          count
          zoneNames
          bodyParts
          usingWeapon {
            ...ItemData
            properties {
              ... on ItemPropertiesWeapon {
                defaultPreset {
                  ...ItemData
                }
              }
            }
          }
          usingWeaponMods {
            ...ItemData
          }
          wearing {
            ...ItemData
          }
          notWearing {
            ...ItemData
          }
          distance {
            compareMethod
            value
          }
          playerHealthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
          enemyHealthEffect {
            bodyParts
            effects
            time {
              compareMethod
              value
            }
          }
          zones {
            ...TaskZoneData
          }
        }
        ... on TaskObjectiveSkill {
          skillLevel {
            name
            level
          }
        }
        ... on TaskObjectiveTaskStatus {
          task {
            id
            name
          }
          status
        }
        ... on TaskObjectiveTraderLevel {
          trader {
            id
            name
          }
          level
        }
        ... on TaskObjectiveTraderStanding {
          trader {
            id
            name
          }
          compareMethod
          value
        }
        ... on TaskObjectiveUseItem {
          useAny {
            ...ItemData
          }
          zones {
            ...TaskZoneData
          }
          count
        }
      }
      failureOutcome {
        traderStanding {
          trader {
            id
            name
          }
          standing
        }
        items {
          count
          item {
            ...ItemData
            containsItems {
              item {
                ...ItemData
              }
              count
            }
          }
        }
        offerUnlock {
          id
          trader {
            id
            name
          }
          level
          item {
            ...ItemData
            containsItems {
              count
              item {
                ...ItemData
              }
            }
          }
        }
        skillLevelReward {
          name
          level
        }
        traderUnlock {
          id
          name
        }
        craftUnlock {
          id
        }
      }
      factionName
      neededKeys {
        keys {
          ...ItemData
        }
        map {
          id
          name
        }
      }
    }
    maps {
      id
      name
      tarkovDataId
      enemies
      wiki
      raidDuration
      players
      description
    }
    playerLevels {
      level
      exp
      levelBadgeImageLink
    }
    traders {
      id
      name
      resetTime
      imageLink
      levels {
        id
        level
        requiredPlayerLevel
        requiredReputation
        requiredCommerce
        insuranceRate
        payRate
        repairCostMultiplier
      }
    }
  }
`;
