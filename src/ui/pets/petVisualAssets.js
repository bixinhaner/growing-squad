import { appPath } from '../../data/paths.js'
export const ILLUSTRATED_PETS = ['unicorn', 'puppy', 'rabbit', 'fox', 'chick']
export const illustrated = species => ILLUSTRATED_PETS.includes(species)
export const petImage = (species, pose = 'idle') => appPath(`assets/pets-v2/pets/${species}/${pose}.webp`)
export const eggImage = species => appPath(`assets/pets-v2/eggs/${species}.webp`)
export const itemImage = kind => appPath(`assets/pets-v2/${['badge','star'].includes(kind) ? kind : `shop/${kind}`}.webp`)
export const GENERATED_PROPS = ['badge','star','dress-pink','dress-sailor','dress-rainbow','dress-leaf','dress-bee','house-strawberry','house-cloud','house-moon','house-tree','house-star','furniture-bed','furniture-lamp','furniture-rug','furniture-shelf','furniture-cushion','furniture-chest']
