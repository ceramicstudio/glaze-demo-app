import Ceramic from '@ceramicnetwork/http-client'
import { IDX } from '@ceramicstudio/idx'
import { EthereumAuthProvider, ThreeIdConnect } from '3id-connect'
import Web3Modal from 'web3modal'

import { definitions } from './config.json'

const CERAMIC_URL = 'https://ceramic-dev.3boxlabs.com'

// @ts-ignore argument
const threeID = new ThreeIdConnect()
const web3modal = new Web3Modal({ network: 'mainnet', cacheProvider: true })

export type NoteItem = {
  id: string
  title: string
}

export type NotesList = { notes: Array<NoteItem> }

export type IDXInit = NotesList & {
  ceramic: Ceramic
  idx: IDX
}

export async function getIDX(): Promise<IDXInit> {
  // Connect an Ethereum provider
  const ethereumProvider = await web3modal.connect()
  const { result } = await ethereumProvider.send('eth_requestAccounts')

  // Authenticate using the Ethereum provider in 3ID Connect
  await threeID.connect(new EthereumAuthProvider(ethereumProvider, result[0]))

  // Create the Ceramic instance and inject provider
  const ceramic = new Ceramic(CERAMIC_URL)
  await ceramic.setDIDProvider(threeID.getDidProvider())

  // Create the IDX instance with the definitions aliases from the config
  const idx = new IDX({ ceramic, aliases: definitions })

  // Load the existing notes
  const notesList = await idx.get<{ notes: Array<NoteItem> }>('notes')
  return { ceramic, idx, notes: notesList?.notes ?? [] }
}
