import { renderToStaticMarkup } from 'react-dom/server'
import { PetCreature } from '../src/ui/pets/PetCreature.jsx'
import { PetProp, EggArt } from '../src/ui/pets/PetArt.jsx'

export function creature(props) { return renderToStaticMarkup(<PetCreature {...props}/>) }
export function egg(props) { return renderToStaticMarkup(<EggArt {...props}/>) }
export function prop(props) { return renderToStaticMarkup(<PetProp {...props}/>) }
