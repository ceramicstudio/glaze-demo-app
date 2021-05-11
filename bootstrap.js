const { writeFile } = require('fs').promises
const Ceramic = require('@ceramicnetwork/http-client').default
const { createDefinition, publishSchema } = require('@ceramicstudio/idx-tools')
const { Ed25519Provider } = require('key-did-provider-ed25519')
const fromString = require('uint8arrays/from-string')
const KeyDidResolver = require('key-did-resolver').default;
const ThreeIdResolver = require('@ceramicnetwork/3id-did-resolver').default;
const DID = require('dids').DID

const CERAMIC_URL = 'http://localhost:7007'

const NoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Note',
  type: 'object',
  properties: {
    date: {
      type: 'string',
      format: 'date-time',
      title: 'date',
      maxLength: 30,
    },
    text: {
      type: 'string',
      title: 'text',
      maxLength: 4000,
    },
  },
}

const NotesListSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'NotesList',
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      title: 'notes',
      items: {
        type: 'object',
        title: 'NoteItem',
        properties: {
          id: {
            $ref: '#/definitions/CeramicDocId',
          },
          title: {
            type: 'string',
            title: 'title',
            maxLength: 100,
          },
        },
      },
    },
  },
  definitions: {
    CeramicDocId: {
      type: 'string',
      pattern: '^ceramic://.+(\\?version=.+)?',
      maxLength: 150,
    },
  },
}

async function run() {
  // The seed must be provided as an environment variable
  const seed = fromString(process.env.SEED, 'base16')
  // Connect to the local Ceramic node
  const ceramic = new Ceramic(CERAMIC_URL)
  // Authenticate the Ceramic instance with the provider
  const keyDidResolver = KeyDidResolver.getResolver()
  const threeIdResolver = ThreeIdResolver.getResolver(ceramic)
  const resolverRegistry = {
    ...threeIdResolver,
    ...keyDidResolver,
  }
  const did = new DID({
    provider: new Ed25519Provider(seed),
    resolver: resolverRegistry,
  })
  await did.authenticate()
  await ceramic.setDID(did)

  // Publish the two schemas
  const [noteSchema, notesListSchema] = await Promise.all([
    publishSchema(ceramic, { content: NoteSchema }),
    publishSchema(ceramic, { content: NotesListSchema }),
  ])

  // Create the definition using the created schema ID
  const notesDefinition = await createDefinition(ceramic, {
    name: 'notes',
    description: 'Simple text notes',
    schema: notesListSchema.commitId.toUrl(),
  })

  // Write config to JSON file
  const config = {
    definitions: {
      notes: notesDefinition.id.toString(),
    },
    schemas: {
      Note: noteSchema.commitId.toUrl(),
      NotesList: notesListSchema.commitId.toUrl(),
    },
  }
  await writeFile('./src/config.json', JSON.stringify(config))

  console.log('Config written to src/config.json file:', config)
  process.exit(0)
}

run().catch(console.error)
