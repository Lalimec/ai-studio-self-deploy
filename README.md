# AI Studio Self Deploy

A comprehensive React web application providing multiple AI-powered creative studios. Self-deployable version with support for Google Gemini and external AI models.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 🎨 Features

### Creative Studios

- **Hair Studio** - Virtual hairstyle try-on with 100+ styles
- **Baby Studio** - AI-generated baby imagery from parent photos
- **Image Studio** - Batch image variation generation
- **Video Studio** - Convert static images to animated videos
- **Timeline Studio** - Create video transitions between image sequences
- **Ad Cloner** (Beta) - Deconstruct and generate ad variations
- **Video Analyzer** (Beta) - Analyze video ads and generate concepts

### AI Model Support

**Native Gemini Models:**
- Gemini 2.5 Pro & Flash (text generation)
- Gemini 2.5 Flash Image (native image editing)
- Imagen 4 Ultra, Standard, Fast (image generation)

**External Webhook Models:**
- Nano Banana (via n8n webhook)
- Seedream 4.0
- Flux Kontext Pro
- Seedance V1 Pro (video generation)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
- (Optional) n8n webhooks for external AI models

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-studio-self-deploy.git
   cd ai-studio-self-deploy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Create .env.local file
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

### Production Build

```bash
npm run build
npm run preview
```

## ☁️ Deployment

### Quick Deploy Options

- **Google Cloud Run** - Recommended for production ([See guide](./DEPLOYMENT.md#google-cloud-run))
- **Google Cloud Storage** - Static hosting ([See guide](./DEPLOYMENT.md#google-cloud-storage))
- **Vercel** - One-click deploy ([See guide](./DEPLOYMENT.md#vercel))
- **Netlify** - Simple static hosting ([See guide](./DEPLOYMENT.md#netlify))

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key |

### Optional: External AI Models

To use external webhook models (Nano Banana, Seedream, Flux), configure endpoints in `services/endpoints.ts`.

## 📁 Project Structure

```
ai-studio-self-deploy/
├── components/          # React components
│   ├── videoAnalyzer/  # Video Analyzer components
│   ├── adCloner/       # Ad Cloner components
│   └── ...
├── hooks/              # Custom React hooks
├── services/           # API services
│   ├── geminiService.ts    # Unified AI generation
│   ├── endpoints.ts        # External API configuration
│   └── ...
├── prompts/            # AI system prompts
├── videoAnalyzer/      # Video Analyzer mock data
├── types.ts            # TypeScript definitions
├── constants.ts        # App constants
└── App.tsx             # Main application

```

## 🎮 Usage

### Enabling Beta Features

1. Click the settings icon (top-left)
2. Toggle "Show Beta Features"
3. Ad Cloner and Video Analyzer will appear in navigation

### Switching AI Models

1. Each studio has model selection in its settings
2. Toggle webhook usage for Nano Banana per studio
3. Settings are persisted in localStorage

### Video Analyzer Workflow

1. Upload a video ad
2. AI analyzes with 10-point framework
3. View storyboard with key frames
4. Generate static ad concepts
5. Create scene variations

## 🛠️ Development

### Tech Stack

- **Framework:** React 19.1.1 with TypeScript
- **Build Tool:** Vite 5.2.10
- **AI SDK:** Google GenAI 1.21.0
- **Styling:** Tailwind CSS (CDN)
- **Icons:** Lucide React

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Code Quality

- TypeScript strict mode enabled
- ES2022 target
- Path alias: `@/` → project root

## 📝 API Quota Management

**Free Tier (Gemini API):**
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per day

**Best Practices:**
- Use mock data mode during development
- Monitor quota in Google AI Studio
- Implement concurrency limits (default: 3 parallel requests)

## 🔐 Security Notes

- Never commit `.env.local` to git
- API key is exposed in client bundle (necessary for browser use)
- Use environment-specific API keys
- Consider implementing server-side proxy for production

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Errors

- Verify `GEMINI_API_KEY` in `.env.local`
- Check quota limits in Google AI Studio
- Enable "Use mock data" in settings for testing

### Type Errors

```bash
# Regenerate TypeScript types
npx tsc --noEmit
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed codebase documentation for AI assistants
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guides for various platforms
- [Video Analyzer Docs](./videoAnalyzer/) - Video Analyzer implementation guides

## 🤝 Contributing

This is a self-deploy version. For contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - Feel free to use for personal or commercial projects

## 🙏 Acknowledgments

- Google Gemini AI for powerful AI models
- React team for excellent framework
- Vite for blazing fast build tool
- Open source community

## 📞 Support

- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/ai-studio-self-deploy/issues)
- Documentation: See `CLAUDE.md` for architecture details
- API Help: [Google AI Studio](https://aistudio.google.com)

---

**Built with ❤️ using Google Gemini AI**
