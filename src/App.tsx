import type { Doctype } from '@ceramicnetwork/common'
import AppBar from '@material-ui/core/AppBar'
import Button from '@material-ui/core/Button'
import CssBaseline from '@material-ui/core/CssBaseline'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import Divider from '@material-ui/core/Divider'
import Drawer from '@material-ui/core/Drawer'
import Hidden from '@material-ui/core/Hidden'
import IconButton from '@material-ui/core/IconButton'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import ListItemText from '@material-ui/core/ListItemText'
import Paper from '@material-ui/core/Paper'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import TextField from '@material-ui/core/TextField'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import {
  makeStyles,
  useTheme,
  Theme,
  createStyles,
} from '@material-ui/core/styles'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import DeleteIcon from '@material-ui/icons/Delete'
import EditIcon from '@material-ui/icons/Edit'
import ErrorIcon from '@material-ui/icons/ErrorOutline'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import MenuIcon from '@material-ui/icons/Menu'
import NoteIcon from '@material-ui/icons/Note'
import NoteAddIcon from '@material-ui/icons/NoteAdd'
import UploadIcon from '@material-ui/icons/CloudUpload'
import { randomBytes } from '@stablelib/random'
import React, { useRef, useState } from 'react'
import { fromString, toString } from 'uint8arrays'

import { useApp } from './state'
import type {
  AuthState,
  DraftStatus,
  IndexLoadedNote,
  State,
  StoredNote,
} from './state'

const drawerWidth = 300

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
    },
    drawer: {
      [theme.breakpoints.up('sm')]: {
        width: drawerWidth,
        flexShrink: 0,
      },
    },
    appBar: {
      [theme.breakpoints.up('sm')]: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
      },
    },
    menuButton: {
      marginRight: theme.spacing(2),
      [theme.breakpoints.up('sm')]: {
        display: 'none',
      },
    },
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar,
    drawerPaper: {
      width: drawerWidth,
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
    },
    title: {
      flexGrow: 1,
    },
    noteSaveButton: {
      marginTop: theme.spacing(2),
    },
    noteTextarea: {
      border: 0,
      fontSize: theme.typography.pxToRem(18),
      padding: theme.spacing(2),
      width: '100%',
    },
  }),
)

type NotesListProps = {
  deleteDraft: () => void
  openDraft: () => void
  openNote: (docID: string) => void
  state: State
}

function NotesList({
  deleteDraft,
  openDraft,
  openNote,
  state,
}: NotesListProps) {
  let draft
  if (state.nav.type === 'draft') {
    let icon
    switch (state.draftStatus) {
      case 'failed':
        icon = <ErrorIcon />
        break
      case 'saving':
        icon = <UploadIcon />
        break
      default:
        icon = <EditIcon />
    }
    draft = (
      <ListItem button onClick={() => openDraft()} selected>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary="Draft note" />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={() => deleteDraft()}>
            <DeleteIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    )
  } else if (state.auth.status === 'done') {
    draft = (
      <ListItem button onClick={() => openDraft()}>
        <ListItemIcon>
          <NoteAddIcon />
        </ListItemIcon>
        <ListItemText primary="New note" />
      </ListItem>
    )
  } else {
    draft = (
      <ListItem>
        <ListItemIcon>
          <NoteAddIcon />
        </ListItemIcon>
        <ListItemText primary="Authenticate to create note" />
      </ListItem>
    )
  }

  const notes = Object.entries(state.notes).map(([docID, note]) => {
    const isSelected = state.nav.type === 'note' && state.nav.docID === docID

    let icon
    switch (note.status) {
      case 'loading failed':
      case 'saving failed':
        icon = <ErrorIcon />
        break
      case 'loading':
        icon = <DownloadIcon />
        break
      case 'saving':
        icon = <UploadIcon />
        break
      default:
        icon = isSelected ? <EditIcon /> : <NoteIcon />
    }

    return (
      <ListItem
        button
        key={docID}
        onClick={() => openNote(docID)}
        selected={isSelected}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={note.title} />
      </ListItem>
    )
  })

  return (
    <>
      <List>{draft}</List>
      <Divider />
      <List>{notes}</List>
    </>
  )
}

type AuthenticateProps = {
  authenticate: (seed: Uint8Array) => void
  state: AuthState
}

function AuthenticateScreen({ authenticate, state }: AuthenticateProps) {
  const [seed, setSeed] = useState('')
  const isLoading = state.status === 'loading'

  return state.status === 'done' ? (
    <Typography>Authenticated with ID {state.idx.id}</Typography>
  ) : (
    <>
      <Typography>
        You need to authenticate to load your existing notes and create new
        ones.
      </Typography>
      <div>
        <TextField
          autoFocus
          disabled={isLoading}
          fullWidth
          id="seed"
          label="Seed"
          onChange={(event) => setSeed(event.target.value)}
          placeholder="base16-encoded string of 32 bytes length"
          type="text"
          value={seed}
        />
      </div>
      <Button
        color="primary"
        disabled={seed === '' || isLoading}
        onClick={() => authenticate(fromString(seed, 'base16'))}
        variant="contained">
        Authenticate
      </Button>
      <Button
        color="primary"
        disabled={isLoading}
        onClick={() => setSeed(toString(randomBytes(32), 'base16'))}>
        Generate random seed
      </Button>
    </>
  )
}

type DraftScreenProps = {
  save: (title: string, text: string) => void
  status: DraftStatus
}

function DraftScreen({ save, status }: DraftScreenProps) {
  const classes = useStyles()
  const [open, setOpen] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSave = () => {
    const text = textRef.current?.value
    const title = titleRef.current?.value
    if (text && title) {
      save(title, text)
    }
    setOpen(false)
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Save note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="title"
            label="Note title"
            inputRef={titleRef}
            type="text"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary" variant="outlined">
            Save note
          </Button>
        </DialogActions>
      </Dialog>
      <Paper elevation={5}>
        <TextareaAutosize
          className={classes.noteTextarea}
          disabled={status === 'saving'}
          placeholder="Note contents..."
          ref={textRef}
          rowsMin={10}
          rowsMax={20}
        />
      </Paper>
      <Button
        className={classes.noteSaveButton}
        color="primary"
        disabled={status === 'saving'}
        onClick={handleOpen}
        variant="contained">
        Save
      </Button>
    </>
  )
}

type NoteScreenProps = {
  note: IndexLoadedNote | StoredNote
  save: (doc: Doctype, text: string) => void
}

function NoteScreen({ note, save }: NoteScreenProps) {
  const classes = useStyles()
  const textRef = useRef<HTMLTextAreaElement>(null)

  if (note.status === 'loading failed') {
    return <Typography>Failed to load note!</Typography>
  }

  if (note.status === 'init' || note.status === 'loading') {
    return <Typography>Loading note...</Typography>
  }

  const doc = (note as StoredNote).doc
  return (
    <>
      <Paper elevation={5}>
        <TextareaAutosize
          className={classes.noteTextarea}
          disabled={note.status === 'saving'}
          defaultValue={doc.content.text}
          placeholder="Note contents..."
          ref={textRef}
          rowsMin={10}
          rowsMax={20}
        />
      </Paper>
      <Button
        className={classes.noteSaveButton}
        color="primary"
        disabled={note.status === 'saving'}
        onClick={() => save(doc, textRef.current?.value ?? '')}
        variant="contained">
        Save
      </Button>
    </>
  )
}

export default function App() {
  const app = useApp()
  const classes = useStyles()
  const theme = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <NotesList
        deleteDraft={app.deleteDraft}
        openDraft={app.openDraft}
        openNote={app.openNote}
        state={app.state}
      />
    </div>
  )

  let screen
  switch (app.state.nav.type) {
    case 'draft':
      screen = (
        <DraftScreen save={app.saveDraft} status={app.state.draftStatus} />
      )
      break
    case 'note':
      screen = (
        <NoteScreen
          key={app.state.nav.docID}
          note={app.state.notes[app.state.nav.docID]}
          save={app.saveNote}
        />
      )
      break
    default:
      screen = (
        <AuthenticateScreen
          authenticate={app.authenticate}
          state={app.state.auth}
        />
      )
  }

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}>
            <MenuIcon />
          </IconButton>
          <Typography className={classes.title} noWrap variant="h6">
            IDX demo notes app
          </Typography>
          <Button color="inherit" href="https://idx.xyz" variant="outlined">
            IDX
          </Button>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="notes">
        <Hidden smUp implementation="css">
          <Drawer
            variant="temporary"
            anchor={theme.direction === 'rtl' ? 'right' : 'left'}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{ paper: classes.drawerPaper }}
            ModalProps={{ keepMounted: true }}>
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
            classes={{ paper: classes.drawerPaper }}
            variant="permanent"
            open>
            {drawer}
          </Drawer>
        </Hidden>
      </nav>
      <main className={classes.content}>
        <div className={classes.toolbar} />
        {screen}
      </main>
    </div>
  )
}
