import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';


// ============================================
// Pure utility functions
// ============================================

const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const formatDate = (date = new Date()) =>
  date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

const isValidText = (text, minLength = 3) =>
  text && text.trim().length >= minLength;

// ============================================
// Content extraction functions
// ============================================

const extractTitle = ($) =>
  $('h1').first().text().trim() ||
  $('title').text().trim() ||
  '';

const extractMetadata = ($, url) => ({
  description: $('meta[name="description"]').attr('content') || '',
  url,
  scrapedAt: new Date().toISOString()
});

const extractHeading = ($el, tagName) => {
  const content = $el.text().trim();
  return content ? { type: tagName, content } : null;
};

const extractParagraph = ($el) => {
  const content = $el.text().trim();
  return isValidText(content) ? { type: 'paragraph', content } : null;
};

const extractList = ($el, type, $) => {
  const items = $el
    .find('> li')
    .map((i, li) => $(li).text().trim())
    .get()
    .filter(Boolean);

  return items.length ? { type, items } : null;
};

const extractQuote = ($el) => {
  const content = $el.text().trim();
  return content ? { type: 'quote', content } : null;
};

const extractSectionByType = ($el, tagName, $) => {
  const extractors = {
    h1: () => extractHeading($el, 'h1'),
    h2: () => extractHeading($el, 'h2'),
    h3: () => extractHeading($el, 'h3'),
    h4: () => extractHeading($el, 'h4'),
    h5: () => extractHeading($el, 'h5'),
    h6: () => extractHeading($el, 'h6'),
    p: () => extractParagraph($el),
    ul: () => extractList($el, 'bullet-list', $),
    ol: () => extractList($el, 'numbered-list', $),
    blockquote: () => extractQuote($el)
  };

  return extractors[tagName]?.() || null;
};

const extractSections = ($) => {
  const mainContent = $('main, .main-content, #main, article, [role="main"], body').first();
  const sections = [];
  const seen = new Set(); // Track seen content to avoid duplicates

  mainContent.find('*').each((i, el) => {
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();

    // Skip if element is inside another processed element
    if ($el.parents('ul, ol, table').length > 0) return;

    const section = extractSectionByType($el, tagName, $);
    if (section) {
      // Create unique key based on content
      const key = section.type + ':' + (section.content || section.items?.join(',') || '');

      // Only add if not seen before
      if (!seen.has(key)) {
        sections.push(section);
        seen.add(key);
      }
    }
  });

  return sections;
};

const removeUnwantedElements = ($) => {
  // Remove unwanted elements
  $('script, style, noscript, iframe, svg').remove();
  $('header, footer, nav, .cookie-banner, .announcement-bar').remove();

  // Remove navigation, menus, and repetitive sections
  $('nav, menu, .navigation, .menu, .nav').remove();
  $('button, .button, [role="button"]').remove();

  // Remove only standalone forms and inputs, not those inside content paragraphs
  $('form').remove();
  $('input[type="checkbox"], input[type="radio"], input[type="hidden"]').remove();
  $('select, textarea').remove();

  // Remove duplicated content sections
  $('.header, .footer, .sidebar').remove();

  return $;
};

// ============================================
// HTML generation functions
// ============================================

const renderSection = (section) => {
  const renderers = {
    h1: (s) => `<h1>${escapeHtml(s.content)}</h1>`,
    h2: (s) => `<h2>${escapeHtml(s.content)}</h2>`,
    h3: (s) => `<h3>${escapeHtml(s.content)}</h3>`,
    h4: (s) => `<h4>${escapeHtml(s.content)}</h4>`,
    paragraph: (s) => `<p>${escapeHtml(s.content)}</p>`,
    'bullet-list': (s) => `<ul>${s.items.map(item =>
      `<li>${escapeHtml(item)}</li>`
    ).join('')}</ul>`,
    'numbered-list': (s) => `<ol>${s.items.map(item =>
      `<li>${escapeHtml(item)}</li>`
    ).join('')}</ol>`,
    quote: (s) => `<blockquote>${escapeHtml(s.content)}</blockquote>`
  };

  return renderers[section.type]?.(section) || '';
};

const renderSections = (sections) =>
  sections.map(renderSection).join('\n');

const renderHeader = (content) => `
  <div class="header">
    <h1>${escapeHtml(content.title)}</h1>
    <div class="metadata">
      <p>Quelle: ${escapeHtml(content.metadata.url)}</p>
      <p>Generiert am: ${formatDate()}</p>
    </div>
  </div>
`;

const renderFooter = (footerText = '') => `
  <div class="footer">
    <p>${escapeHtml(footerText)}</p>
  </div>
`;

const getStyles = () => `
  @page {
    margin: 2cm;
  }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    font-size: 11pt;
  }
  h1 {
    font-size: 24pt;
    color: #1a1a1a;
    margin-top: 0;
    margin-bottom: 20px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 18pt;
    color: #2a2a2a;
    margin-top: 24px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 14pt;
    color: #3a3a3a;
    margin-top: 18px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  p {
    margin-bottom: 12px;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }
  ul, ol {
    margin-bottom: 12px;
    padding-left: 25px;
  }
  li {
    margin-bottom: 6px;
  }
  blockquote {
    margin: 15px 0;
    padding: 10px 20px;
    border-left: 4px solid #ddd;
    background: #f9f9f9;
    font-style: italic;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #333;
  }
  .metadata {
    font-size: 9pt;
    color: #666;
    margin-top: 10px;
  }
  .footer {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #ccc;
    font-size: 9pt;
    color: #666;
    text-align: center;
  }
`;

const generateHTML = (content, options = {}) => `
  <!DOCTYPE html>
  <html lang="de">
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(content.title)}</title>
    <style>${getStyles()}</style>
  </head>
  <body>
    ${renderHeader(content)}
    ${renderSections(content.sections)}
    ${renderFooter(options.footerText)}
  </body>
  </html>
`;

// ============================================
// Side effect functions (scraping, PDF)
// ============================================

const fetchHTML = async (url) => {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  return data;
};

const parseHTML = (html) => cheerio.load(html);

const scrapeContent = async (url) => {
  const html = await fetchHTML(url);
  const $ = parseHTML(html);
  const cleaned$ = removeUnwantedElements($);

  return {
    title: extractTitle(cleaned$),
    metadata: extractMetadata(cleaned$, url),
    sections: extractSections(cleaned$)
  };
};

const createPDFFromHTML = async (html, outputPath, options = {}) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: options.format || 'A4',
    margin: options.margin || {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();
};

// ============================================
// Main composition functions
// ============================================

const generatePDF = async (url, outputPath, options = {}) => {
  const content = await scrapeContent(url);
  const html = generateHTML(content, { footerText: options.footerText });
  await createPDFFromHTML(html, outputPath, options);

  console.log(`✓ PDF created: ${outputPath}`);
  return content;
};

// ============================================
// Export public API
// ============================================

export {
  // Main functions
  scrapeContent,
  generateHTML,
  generatePDF,

  // Utility functions (useful for testing/customization)
  escapeHtml,
  formatDate,

  // Content extraction (if you want to customize)
  extractTitle,
  extractMetadata,
  extractSections,

  // HTML rendering (if you want custom templates)
  renderSection,
  renderSections,
  getStyles
};


