import { renderToStaticMarkup } from 'react-dom/server'
import { PetActor, EggArt, PetProp } from '../src/ui/pets/PetArt.jsx'
export const actorMarkup = props => renderToStaticMarkup(<PetActor {...props} />)
export const eggMarkup = props => renderToStaticMarkup(<EggArt {...props} />)
export const propMarkup = props => renderToStaticMarkup(<PetProp {...props} />)
