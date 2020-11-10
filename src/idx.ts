import Ceramic from '@ceramicnetwork/ceramic-http-client'
import { IDXWeb } from '@ceramicstudio/idx-web'
// @ts-ignore no type definitions for 3ID Connect yet
import { EthereumAuthProvider } from '3id-connect'
import Web3Modal from 'web3modal'

import { definitions } from './config.json'

const CERAMIC_URL = 'https://ceramic.3boxlabs.com' // 'http://localhost:7007'

const web3modal = new Web3Modal({ network: 'mainnet', cacheProvider: true })

export type NoteItem = {
  id: string
  title: string
}

export type NotesList = { notes: Array<NoteItem> }

export type IDXInit = NotesList & {
  ceramic: Ceramic
  idx: IDXWeb
}

export async function getIDX(): Promise<IDXInit> {
  const ceramic = new Ceramic(CERAMIC_URL)
  // Create the IDX instance with the definitions aliases from the config
  const idx = new IDXWeb({ ceramic, definitions })
  // Connect an Ethereum provider
  const ethereumProvider = await web3modal.connect()
  const { result } = await ethereumProvider.send('eth_requestAccounts')
  // Authenticate the IDX instance using the Ethereum provider via 3ID Connect
  await idx.authenticate({
    authProvider: new EthereumAuthProvider(ethereumProvider, result[0]),
  })
  // Load the existing notes
  const notesList = await idx.get<{ notes: Array<NoteItem> }>('notes')
  return { ceramic, idx, notes: notesList?.notes ?? [] }
}
