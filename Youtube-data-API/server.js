
import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import { google } from 'googleapis'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const app = express()
app.use(bodyParser.json({ limit: '10mb' }))

// --- OpenAI client ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// --- Google OAuth2 client ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT
)

const TOKENS_PATH = path.join(__dirname, 'tokens.json')

// token helpers
async function loadTokens() {
  if (await fs.pathExists(TOKENS_PATH)) {
    const t = await fs.readJson(TOKENS_PATH)
    oauth2Client.setCredentials(t)
  }
}
async function saveTokens(tokens) {
  await fs.writeJson(TOKENS_PATH, tokens, { spaces: 2 })
}

function getAuthUrl() {
  const scopes = ['https://www.googleapis.com/auth/youtube.readonly']
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  })
}

// --- OAuth routes ---
app.get('/auth/url', (_req, res) => {
  res.json({ url: getAuthUrl() })
})

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query
    const { tokens } = await oauth2Client.getToken(code)
    await saveTokens(tokens)
    oauth2Client.setCredentials(tokens)
    res.send('<h2>Auth complete. You can close this tab.</h2>')
  } catch (err) {
    console.error(err)
    res.status(500).send('OAuth error')
  }
})

// load tokens on boot
await loadTokens()

// --- YouTube helpers ---
const youtube = google.youtube('v3')

async function pickCaptionTrack(videoId, langPreferred = 'en') {
  const auth = oauth2Client
  const list = await youtube.captions.list({
    auth,
    part: ['id', 'snippet'],
    videoId,
  })

  const items = list.data.items || []
  if (!items.length) return null

  // pick best track
  const score = (it) => {
    const s = it.snippet || {}
    let sc = 0
    if (s.language === langPreferred) sc += 10
    if (!s.trackKind || s.trackKind !== 'ASR') sc += 5
    if (s.isDraft) sc -= 5
    return sc
  }
  return items.sort((a, b) => score(b) - score(a))[0]
}

async function downloadCaptionSRT(captionId) {
  const url = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&alt=media`
  const headers = await oauth2Client.getRequestHeaders()
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`captions.download failed: ${res.status} ${text}`)
  }
  return await res.text()
}

function srtToVtt(srt) {
  return (
    'WEBVTT\n\n' +
    srt.replace(/\r/g, '').replace(/(\d+)\n(\d{2}:[^\n]+)-->([^\n]+)\n/g, '$1\n$2 -->$3\n')
  )
}

function srtToPlainText(srt) {
  let txt = srt.replace(/^\d+\s*$/gm, '') // sequence numbers
  txt = txt.replace(
    /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g,
    ''
  ) // timestamps
  txt = txt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
  return txt
}

// --- API: fetch subtitles ---
app.get('/api/subtitles', async (req, res) => {
  try {
    const { videoId, lang = 'en', format = 'txt' } = req.query
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' })

    if (
      !(
        oauth2Client.credentials &&
        (oauth2Client.credentials.access_token ||
          oauth2Client.credentials.refresh_token)
      )
    ) {
      return res
        .status(401)
        .json({ error: 'Not authorized. Visit /auth/url to connect your YouTube account.' })
    }

    const track = await pickCaptionTrack(String(videoId), String(lang))
    if (!track)
      return res
        .status(404)
        .json({ error: 'No caption tracks found for this video (or you are not the owner).' })

    const srt = await downloadCaptionSRT(track.id)

    if (format === 'srt') {
      res.type('text/plain').send(srt)
    } else if (format === 'vtt') {
      res.type('text/vtt').send(srtToVtt(srt))
    } else {
      res.type('text/plain').send(srtToPlainText(srt))
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// --- API: summarize with GPT ---
app.post('/api/summarize', async (req, res) => {
  try {
    const { videoId, lang = 'en', prompt } = req.body || {}
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' })

    // fetch plain text captions internally
    const url = new URL(`http://localhost:${PORT}/api/subtitles`)
    url.searchParams.set('videoId', videoId)
    url.searchParams.set('lang', lang)
    url.searchParams.set('format', 'txt')

    const capRes = await fetch(url.toString())
    if (!capRes.ok) {
      const t = await capRes.text()
      return res.status(capRes.status).json({ error: `Subtitle fetch failed: ${t}` })
    }
    const transcript = await capRes.text()

    const system =
      'You are a concise, structured summarizer for video transcripts. Output clear bullet points with timestamps if available.'
    const user = [
      prompt || 'Summarize the transcript into: key takeaways, short outline, and action items.',
      '',
      'Transcript:',
      transcript.slice(0, 180_000),
    ].join('\n')

    const completion = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })

    const text = completion.output_text || completion.content?.[0]?.text || ''

    res.json({ videoId, summary: text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`)
})
