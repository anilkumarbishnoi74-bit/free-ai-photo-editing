# Free AI Photo Editing

ChatGPT-style AI photo website with:

- AI image generation
- AI prompt generation
- AI photo editing
- 4K enhancement placeholder / integration point
- Responsive mobile UI
- Server-side API key handling

## 1. Install

Install Node.js 18+ (Node 20+ recommended).

Then:

```bash
npm install
```

## 2. Add API key

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and add your API key:

```env
OPENAI_API_KEY=your_real_key
```

Do NOT put the API key inside `public/app.js` or `index.html`.

## 3. Run

```bash
npm start
```

Open:

http://localhost:3000

## 4. Important about "4K"

The included `/api/upscale-info` route intentionally does not pretend that ordinary resizing is true AI 4K enhancement.

To make a real AI 4K enhancer, connect a dedicated super-resolution model/API to a new `/api/upscale` route. The UI is already prepared for that feature.

## 5. Free hosting

For a public deployment, use a Node-compatible host that supports environment variables. Put `OPENAI_API_KEY` in the host's secret/environment-variable settings, not in the frontend.

## 6. Production checklist

- Add rate limiting
- Add authentication if needed
- Validate image MIME types
- Limit upload size
- Add abuse/content controls
- Add usage/cost limits
- Add privacy policy and terms
- Never expose API keys to browser code
