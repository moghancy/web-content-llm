# Web Content LLM

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

Extract web content and export to LLM-friendly formats (Markdown, Text) or PDF. Optimized for AI model consumption with clean semantic structure.

**Perfect for feeding web content to ChatGPT, Gemini, and other LLMs.**

## Features

- 🤖 **LLM-optimized** - Markdown format recommended for ChatGPT and other AI models
- 📝 **Multiple formats** - Export to Markdown (.md), Plain Text (.txt), or PDF (.pdf)
- 🌐 Scrapes websites with real browser support
- 🧹 Intelligent content extraction (removes navigation, ads, duplicates)
- 📊 Preserves semantic structure (headings, paragraphs, lists, quotes)
- 🔄 Automatic deduplication
- ⚡ Fast and lightweight
- ✅ Fully tested with 33 unit tests

## Installation

```bash
# Install dependencies
yarn install
# or
npm install
```

## Dependencies

- **axios** - HTTP client for fetching HTML
- **cheerio** - HTML parsing and manipulation
- **puppeteer** - PDF generation

## Usage

### Basic Usage (Markdown - Recommended for LLMs)

```javascript
import { exportContent } from './index.js';

// Auto-detects format from file extension (.md)
await exportContent('https://example.com/article', './output.md');

// Perfect for feeding to ChatGPT or other LLMs!
```

### Export to Plain Text

```javascript
await exportContent('https://example.com/article', './output.txt');
```

### Export to PDF (Optional)

```javascript
await exportContent('https://example.com/article', './output.pdf', {
  format: 'A4',
  footerText: 'Custom footer text'
});
```

### Explicit Format Override

```javascript
// Force markdown even without .md extension
await exportContent('https://example.com', './output', {
  format: 'markdown',
  footerText: 'Created with web-content-llm'
});
```

### Format-Specific Functions

```javascript
import {
  scrapeContent,
  generateMarkdown,
  generatePlainText,
  generatePDF
} from './index.js';

// Scrape once, export to multiple formats
const content = await scrapeContent('https://example.com');

const markdown = generateMarkdown(content);
const text = generatePlainText(content);

// Save manually
await writeFile('./output.md', markdown);
```

### Running the Example

```bash
# Run with default example (exports to markdown)
node index.js

# Or use yarn
yarn start

# Run tests
yarn test
```

## How It Works

### 1. Content Extraction

The scraper extracts:
- **Headings** (h1-h6)
- **Paragraphs** (with min. 3 characters)
- **Lists** (bullet and numbered)
- **Blockquotes**

### 2. Content Cleaning

Automatically removes:
- Scripts, styles, and SVGs
- Navigation menus and headers/footers
- Forms and input elements
- Buttons and interactive elements
- Duplicate content

### 3. Output Generation

**Markdown** (recommended for LLMs):
- Preserves semantic structure with `#` headings
- Clean bullet and numbered lists
- Blockquotes with `>` syntax
- Metadata in frontmatter style

**Plain Text**:
- Title with underlines (`===`)
- Bullet points with `•`
- Section headings with separators

**PDF** (optional):
- Professional typography
- Proper page breaks
- Metadata footer
- German locale formatting

## Configuration

### Minimum Text Length

Adjust the minimum text length for paragraphs:

```javascript
const isValidText = (text, minLength = 3) =>
  text && text.trim().length >= minLength;
```

### Content Selectors

Customize which elements to extract:

```javascript
const mainContent = $('main, .main-content, #main, article, [role="main"], body').first();
```

### Removal Rules

Add custom removal rules:

```javascript
const removeUnwantedElements = ($) => {
  $('script, style, noscript, iframe, svg').remove();
  $('header, footer, nav').remove();
  // Add your custom rules here
  $('.custom-class-to-remove').remove();
  return $;
};
```

## API Reference

### `exportContent(url, outputPath, options)`

**Main API** - Auto-detects format from file extension or explicit option.

**Parameters:**
- `url` (string) - Website URL to scrape
- `outputPath` (string) - Output file path (.md, .txt, or .pdf)
- `options` (object) - Export options
  - `format` (string) - Override format: `'markdown'`, `'text'`, or `'pdf'`
  - `footerText` (string) - Custom footer text
  - `format` (string) - PDF page format (default: 'A4')
  - `margin` (object) - PDF page margins

**Returns:** Promise<object> - Scraped content object

**Example:**
```javascript
const content = await exportContent('https://example.com', './output.md', {
  footerText: 'Created with web-content-llm'
});
```

### `scrapeContent(url)`

Scrapes and cleans content from a URL.

**Returns:** Promise<object>
```javascript
{
  title: string,
  metadata: { description, url, scrapedAt },
  sections: Array<{type, content, items}>
}
```

### `generateMarkdown(content, options)`

Generates Markdown from scraped content.

**Parameters:**
- `content` (object) - Content object from `scrapeContent()`
- `options` (object) - Options
  - `footerText` (string) - Custom footer text

**Returns:** string - Markdown document

### `generatePlainText(content, options)`

Generates plain text from scraped content.

**Parameters:**
- `content` (object) - Content object from `scrapeContent()`
- `options` (object) - Options
  - `footerText` (string) - Custom footer text

**Returns:** string - Plain text document

### `generatePDF(url, outputPath, options)`

**Legacy API** - Direct PDF generation (backward compatible).

**Parameters:**
- `url` (string) - Website URL to scrape
- `outputPath` (string) - Output PDF file path
- `options` (object) - PDF options
  - `format` (string) - Page format (default: 'A4')
  - `margin` (object) - Page margins
  - `footerText` (string) - Custom footer text

**Returns:** Promise<object> - Scraped content object

### `generateHTML(content, options)`

Generates HTML from scraped content.

**Parameters:**
- `content` (object) - Content object from `scrapeContent()`
- `options` (object) - HTML options
  - `footerText` (string) - Custom footer text

**Returns:** string - HTML document

## Examples

### Extract Article for LLM Analysis

```javascript
// Export to markdown (best for LLMs)
await exportContent(
  'https://blog.example.com/article',
  './article.md',
  { footerText: 'Source: My Blog' }
);

// Now feed the markdown to your LLM for analysis!
```

### Scrape Documentation to Text

```javascript
await exportContent(
  'https://docs.example.com/guide',
  './guide.txt'
);
```

### Generate PDF Report

```javascript
await exportContent(
  'https://example.com/report',
  './report.pdf',
  {
    format: 'Letter',
    footerText: 'Copyright © 2025 My Company'
  }
);
```

### Custom Content Processing

```javascript
const content = await scrapeContent('https://example.com');

// Filter out quotes before export
content.sections = content.sections.filter(s => s.type !== 'quote');

// Export to markdown
const markdown = generateMarkdown(content);
await writeFile('./filtered.md', markdown);
```

### Multi-Format Export

```javascript
const content = await scrapeContent('https://example.com/article');

// Export to all formats
await writeFile('./article.md', generateMarkdown(content));
await writeFile('./article.txt', generatePlainText(content));
await exportContent('https://example.com/article', './article.pdf');
```

## Troubleshooting

### Missing Content

If content is missing from the PDF:

1. Check if text meets minimum length (default: 3 characters)
2. Verify the element isn't being removed by cleaning rules
3. Check if content is inside a removed parent element

### Duplicate Content

The scraper automatically deduplicates content based on type and text. If you see duplicates:

1. Check if content differs slightly (whitespace, formatting)
2. Adjust the deduplication logic in `extractSections()`

### Formatting Issues

- Inline formatting (bold, italic, links) is not preserved - only plain text
- To preserve formatting, modify extraction to use `.html()` instead of `.text()`

## Why Markdown for LLMs?

**Markdown is the optimal format for feeding web content to LLMs:**

1. **Native format** - Most LLMs are extensively trained on markdown
2. **Semantic structure** - Preserves headings, lists, quotes
3. **Clean & readable** - Both for humans and AI
4. **Context-efficient** - Compact representation vs HTML/PDF
5. **Better comprehension** - LLMs understand markdown structure better

## Project Structure

```
web-content-llm/
├── index.js              # Main module (scraper + export)
├── index.test.js         # Test suite (33 tests)
├── vitest.config.js      # Test configuration
├── package.json          # Dependencies and scripts
├── CLAUDE.md             # Development instructions
└── README.md             # This file
```

## Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test --coverage
```

All functionality is thoroughly tested with 33 unit tests covering:
- Content extraction and deduplication
- Markdown, text, and HTML generation
- Utility functions
- Section rendering

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses third-party libraries that are licensed under their own terms:
- axios (MIT)
- cheerio (MIT)
- puppeteer (Apache 2.0)

## Author

**MOGHANCY**

## Contributing

Contributions are welcome! Feel free to:
- Report bugs by opening an issue
- Suggest new features
- Submit pull requests

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.
