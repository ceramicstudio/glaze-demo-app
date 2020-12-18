import Ceramic from '@ceramicnetwork/http-client'
import { IDX } from '@ceramicstudio/idx'
import { Ed25519Provider } from 'key-did-provider-ed25519'

import { definitions } from './config.json'

const CERAMIC_URL = 'http://localhost:7007'

export type NoteItem = {
  id: string
  title: string
}

export type NotesList = { notes: Array<NoteItem> }

export type IDXInit = NotesList & {
  ceramic: Ceramic
  idx: IDX
}

export async function getIDX(seed: Uint8Array): Promise<IDXInit> {
  // Create the Ceramic instance and inject provider
  const ceramic = new Ceramic(CERAMIC_URL)
  await ceramic.setDIDProvider(new Ed25519Provider(seed))

  // Create the IDX instance with the definitions aliases from the config
  const idx = new IDX({ ceramic, aliases: definitions })

  // Load the existing notes
  const notesList = await idx.get<{ notes: Array<NoteItem> }>('notes')
  return { ceramic, idx, notes: notesList?.notes ?? [] }
}
