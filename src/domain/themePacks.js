export const COMPANION_POSES = {
  wave: [0, 0],
  waiting: [1, 0],
  watering: [2, 0],
  celebrate: [0, 1],
  sleep: [1, 1],
  garden: [2, 1],
}

export const COMPANION_PACKS = {
  bear: { name: '眠眠熊', asset: 'assets/companions/bear-poses-v1.webp' },
  rabbit: { name: '月兔', asset: 'assets/companions/rabbit-poses-v1.webp' },
  cloud: { name: '云朵', asset: 'assets/companions/cloud-poses-v1.webp' },
  'space-cat': { name: '太空猫', asset: 'assets/companions/space-cat-poses-v1.webp' },
}

export const THEME_PACKS = {
  'moon-room': {
    name: '月光卧室',
    asset: 'assets/themes/moon-room-world-v1.webp',
    accent: '#f1c66b',
    surface: '#f4f0f8',
  },
  forest: {
    name: '森林小屋',
    asset: 'assets/themes/forest-world-v1.webp',
    accent: '#d8b75f',
    surface: '#edf3e9',
  },
  space: {
    name: '安静太空',
    asset: 'assets/themes/space-world-v1.webp',
    accent: '#9edce5',
    surface: '#ecebf7',
  },
}

export function getCompanionPack(id) {
  return COMPANION_PACKS[id] || COMPANION_PACKS.bear
}

export function getThemePack(id) {
  return THEME_PACKS[id] || THEME_PACKS['moon-room']
}
