#for youtube caption
use:http://localhost:3000/api/subtitles?videoId=YOUR_VIDEO_ID

#for gpt summarize use:
  curl -X POST http://localhost:3000/api/summarize \
    -H "Content-Type: application/json" \
    -d '{"text":"Paste the subtitle text here"}'
