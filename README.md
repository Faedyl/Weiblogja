![alt text](https://github.com/Faedyl/Weiblogja/blob/main/docs/images/logo.webp?raw=true)

# Weiblogja

A modern blog platform with AI-powered journal-to-blog conversion. Transform your academic journals and PDF documents into engaging blog posts automatically.

## ✨ Key Features

- 📝 **AI-Powered PDF Conversion**: Automatically convert journals and PDFs to blog posts
- 🎨 **Intuitive Create Page**: Drag-and-drop interface with real-time preview
- ✏️ **Inline Editing**: Edit titles, summaries, tags, and content seamlessly
- 🏷️ **Smart Tagging**: AI-generated tags for better content organization
- 📱 **Responsive Design**: Beautiful interface across all devices
- 🔐 **User Authentication**: Secure login and user management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Google Gemini API key ([Get one here](https://ai.google.dev/))
- (Optional) OpenRouter API key for fallback ([Get one here](https://openrouter.ai/))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Faedyl/Weiblogja.git
cd Weiblogja
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
OPENROUTER_API_KEY=your_openrouter_key_here # Optional: for fallback when Gemini fails
# Add other required environment variables
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Documentation

- [Journal to Blog Conversion Guide](./docs/JOURNAL_TO_BLOG.md) - Complete guide for PDF to blog conversion
- [API Documentation](./docs/API.md) - API endpoints and usage
- [Deployment Guide](./docs/DEPLOYMENT.md) - How to deploy to production

## 🎯 Usage

### Creating a Blog Post from PDF

1. Navigate to the **Create** page
2. **Upload your PDF**:
   - Drag and drop your PDF file
   - Or click "Browse Files" to select
3. **Wait for AI conversion** (15-45 seconds)
4. **Review and edit** the generated content
5. **Publish** or save as draft

See the [detailed guide](./docs/JOURNAL_TO_BLOG.md) for more information.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router
- **Language**: TypeScript
- **AI**: Google Gemini API (primary), OpenRouter API (fallback)
- **AI Models**: Gemini 2.0, Llama 3.2 (via OpenRouter)
- **PDF Processing**: pdf-parse
- **Styling**: CSS Modules
- **Icons**: Lucide React
- **Authentication**: NextAuth.js
- **Database**: DynamoDB
- **Storage**: AWS S3

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── create/            # PDF to blog creation page
│   ├── blog/              # Blog post pages
│   ├── api/               # API routes
│   └── components/        # React components
├── services/              # Business logic services
│   ├── pdf-extractor.ts   # PDF text extraction
│   ├── gemini-service.ts  # AI conversion service (primary)
│   └── openrouter-service.ts  # AI conversion service (fallback)
├── types/                 # TypeScript type definitions
└── lib/                   # Utility functions
```

## 🎨 Features in Detail

### AI-Powered Conversion
- Extracts text and structure from PDFs
- Transforms academic language to blog-friendly content
- Generates engaging titles and summaries
- Creates relevant tags automatically
- Maintains factual accuracy
- **Automatic fallback**: Uses OpenRouter (Llama 3.2) if Gemini fails

### Enhanced Create Page
- Modern drag-and-drop interface
- Real-time file validation
- Visual progress tracking
- Inline content editing
- Live preview mode
- Tag management

## 🔧 Configuration

### Environment Variables

```env
# Required
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Optional (for AI fallback)
OPENROUTER_API_KEY=your_openrouter_api_key

# AWS (if using)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
```

## 🚦 Development

Run the development server with hot reload:

Run linting:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Troubleshooting

**PDF conversion fails:**
- Ensure your Gemini API key is valid
- If Gemini fails, add an OpenRouter API key for automatic fallback
- Check if the PDF is password-protected (not supported)
- Verify the PDF contains readable text

**Upload size limit:**
- Maximum file size is 50MB
- Compress large PDFs before uploading

See [JOURNAL_TO_BLOG.md](./docs/JOURNAL_TO_BLOG.md) for more troubleshooting tips.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
