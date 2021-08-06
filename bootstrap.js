const { writeFile } = require('fs').promises
const Ceramic = require('@ceramicnetwork/http-client').default
const { ModelManager } = require('@glazed/devtools')
const { DID } = require('dids')
const { Ed25519Provider } = require('key-did-provider-ed25519')
const KeyResolver = require('key-did-resolver').default
const fromString = require('uint8arrays/from-string')

async function run() {
  // The seed must be provided as an environment variable
  const seed = fromString(process.env.SEED, 'base16')
  // Create and authenticate the DID
  const did = new DID({
    provider: new Ed25519Provider(seed),
    resolver: KeyResolver.getResolver(),
  })
  await did.authenticate()

  // Connect to the local Ceramic node
  const ceramic = new Ceramic('http://localhost:7007')
  ceramic.did = did

  // Create a manager for the model
  const manager = new ModelManager(ceramic)

  // Create the schemas
  const noteSchemaID = await manager.createSchema('Note', {
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
  })
  const notesSchemaID = await manager.createSchema('Notes', {
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
              $comment: `cip88:ref:${manager.getSchemaURL(noteSchemaID)}`,
              type: 'string',
              pattern: '^ceramic://.+(\\?version=.+)?',
              maxLength: 150,
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
  })

  // Create the definition using the created schema ID
  await manager.createDefinition('notes', {
    name: 'notes',
    description: 'Simple text notes',
    schema: manager.getSchemaURL(notesSchemaID),
  })

  // Write model to JSON file
  const model = await manager.toPublished()
  await writeFile('./src/model.json', JSON.stringify(model))

  console.log('Model written to src/model.json file:', model)
  process.exit(0)
}

run().catch(console.error)
