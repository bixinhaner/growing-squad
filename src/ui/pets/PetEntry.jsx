import { useNavigate } from 'react-router-dom'
import { useBedtimeState } from '../../store/useBedtime.js'
import { petFor } from '../../modules/pets/petModel.js'
import { EggArt, PetActor } from './PetArt.jsx'
import { Icon } from '../Icons.jsx'
import './pet-entry.css'

export function PetEntry() {
  const { state } = useBedtimeState()
  const pet = petFor(state)
  const navigate = useNavigate()
  return <button type="button" className="pet-world-entry" onClick={() => navigate('/pet')}>
    <span className="pet-entry-portrait">{pet?.hatchedAt ? <PetActor species={pet.species} size="baby" /> : <EggArt species={pet?.species || state.profiles.find((p) => p.id === state.activeProfileId)?.character} />}</span>
    <span><strong>小伙伴的家</strong><small>{pet ? pet.hatchedAt ? `${pet.name}在家等你 · 玩耍、布置和回忆` : `${pet.name}还在蛋里 · 来看看它的小变化` : '从一颗蛋开始，养一个自己的小伙伴'}</small></span><Icon name="chevron" />
  </button>
}
