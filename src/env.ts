import { CeramicClient } from '@ceramicnetwork/http-client'
import { DataModel } from '@glazed/datamodel'
import { DIDDataStore } from '@glazed/did-datastore'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'

import modelAliases from './model.json'

export type Note = {
  date: string
  text: string
}

export type NoteItem = {
  id: string
  title: string
}

export type NotesList = { notes: Array<NoteItem> }

export type ModelTypes = {
  schemas: {
    Note: Note
    Notes: NotesList
  }
  definitions: {
    notes: 'Notes'
  }
  tiles: {}
}

export type Context = {
  ceramic: Ceramic
  model: DataModel<ModelTypes>
  store: DIDDataStore<ModelTypes>
}

export type Env = Context & NotesList

export async function getEnv(seed: Uint8Array): Promise<Env> {
  // Create and authenticate the DID
  const did = new DID({
    provider: new Ed25519Provider(seed),
    resolver: getResolver(),
  })
  await did.authenticate()

  // Create the Ceramic instance and inject the DID
  const ceramic = new CeramicClient('http://localhost:7007')
  ceramic.did = did

  // Create the model and store
  const model = new DataModel({ ceramic, model: modelAliases })
  const store = new DIDDataStore({ ceramic, model })

  // Load the existing notes
  const notesList = await store.get('notes')

  return { ceramic, model, store, notes: notesList?.notes ?? [] }
}
