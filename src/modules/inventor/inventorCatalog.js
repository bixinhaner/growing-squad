import { appPath } from '../../data/paths.js'
import { INVENTOR_STAGES, KNOWLEDGE_CARDS, PROJECT_TEMPLATES } from './inventorTemplates.js'
export { INVENTOR_STAGES, IDEA_SEEDS, PROJECT_TEMPLATES, inventorTemplate, TEST_FINDINGS, NEXT_CHANGES, KNOWLEDGE_CARDS, SHOWCASE_METHODS } from './inventorTemplates.js'
export const inventorImage=(name,seedId='hair-robot') => seedId==='hair-robot' ? appPath(`assets/inventor/hair-robot-${name}.webp`) : appPath('assets/inventor/workshop-hero.webp')
export const knowledgeImage=(name) => appPath(`assets/inventor/${name}`)
export function inventorStage(status) { return INVENTOR_STAGES.find((s) => s.id===status) || INVENTOR_STAGES[0] }
export function knowledgeCard(id) { return KNOWLEDGE_CARDS.find((c) => c.id===id) || PROJECT_TEMPLATES['my-idea'].cards[0] }
