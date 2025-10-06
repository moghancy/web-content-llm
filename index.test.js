import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as cheerio from 'cheerio';
import {
  escapeHtml,
  formatDate,
  extractTitle,
  extractMetadata,
  extractSections,
  generateMarkdown,
  generatePlainText,
  generateHTML,
  renderSection
} from './index.js';

describe('Utility Functions', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml("It's & that")).toBe("It&#039;s &amp; that");
    });
  });

  describe('formatDate', () => {
    it('should format date in German locale', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/15\.\s*Januar\s*2025/);
    });

    it('should use current date if no date provided', () => {
      const formatted = formatDate();
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });
});

describe('Content Extraction', () => {
  describe('extractTitle', () => {
    it('should extract h1 as title', () => {
      const html = '<h1>Main Title</h1><title>Page Title</title>';
      const $ = cheerio.load(html);
      expect(extractTitle($)).toBe('Main Title');
    });

    it('should fallback to title tag if no h1', () => {
      const html = '<title>Page Title</title>';
      const $ = cheerio.load(html);
      expect(extractTitle($)).toBe('Page Title');
    });

    it('should return empty string if neither exists', () => {
      const html = '<div>Content</div>';
      const $ = cheerio.load(html);
      expect(extractTitle($)).toBe('');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata with description and URL', () => {
      const html = '<meta name="description" content="Test description">';
      const $ = cheerio.load(html);
      const metadata = extractMetadata($, 'https://example.com');

      expect(metadata.description).toBe('Test description');
      expect(metadata.url).toBe('https://example.com');
      expect(metadata.scrapedAt).toBeTruthy();
    });

    it('should handle missing description', () => {
      const html = '<div>No meta</div>';
      const $ = cheerio.load(html);
      const metadata = extractMetadata($, 'https://example.com');

      expect(metadata.description).toBe('');
    });
  });

  describe('extractSections', () => {
    it('should extract headings', () => {
      const html = '<main><h1>Title</h1><h2>Subtitle</h2><h3>Section</h3></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).toContainEqual({ type: 'h1', content: 'Title' });
      expect(sections).toContainEqual({ type: 'h2', content: 'Subtitle' });
      expect(sections).toContainEqual({ type: 'h3', content: 'Section' });
    });

    it('should extract paragraphs', () => {
      const html = '<main><p>This is a paragraph</p></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).toContainEqual({
        type: 'paragraph',
        content: 'This is a paragraph'
      });
    });

    it('should extract bullet lists', () => {
      const html = '<main><ul><li>Item 1</li><li>Item 2</li></ul></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).toContainEqual({
        type: 'bullet-list',
        items: ['Item 1', 'Item 2']
      });
    });

    it('should extract numbered lists', () => {
      const html = '<main><ol><li>First</li><li>Second</li></ol></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).toContainEqual({
        type: 'numbered-list',
        items: ['First', 'Second']
      });
    });

    it('should extract blockquotes', () => {
      const html = '<main><blockquote>Quote text</blockquote></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).toContainEqual({
        type: 'quote',
        content: 'Quote text'
      });
    });

    it('should deduplicate content', () => {
      const html = `
        <main>
          <h2>Same Title</h2>
          <h2>Same Title</h2>
          <p>Duplicate paragraph</p>
          <p>Duplicate paragraph</p>
        </main>
      `;
      const $ = cheerio.load(html);
      const sections = extractSections($);

      const h2Count = sections.filter(s => s.type === 'h2' && s.content === 'Same Title').length;
      const pCount = sections.filter(s => s.type === 'paragraph' && s.content === 'Duplicate paragraph').length;

      expect(h2Count).toBe(1);
      expect(pCount).toBe(1);
    });

    it('should filter out short text', () => {
      const html = '<main><p>ab</p><p>This is valid text</p></main>';
      const $ = cheerio.load(html);
      const sections = extractSections($);

      expect(sections).not.toContainEqual({ type: 'paragraph', content: 'ab' });
      expect(sections).toContainEqual({
        type: 'paragraph',
        content: 'This is valid text'
      });
    });
  });
});

describe('Markdown Generation', () => {
  const mockContent = {
    title: 'Test Article',
    metadata: {
      url: 'https://example.com/article',
      scrapedAt: '2025-01-15T12:00:00.000Z',
      description: 'Test description'
    },
    sections: [
      { type: 'h1', content: 'Main Heading' },
      { type: 'h2', content: 'Subheading' },
      { type: 'paragraph', content: 'This is a paragraph.' },
      { type: 'bullet-list', items: ['Item 1', 'Item 2'] },
      { type: 'numbered-list', items: ['First', 'Second'] },
      { type: 'quote', content: 'A wise quote' }
    ]
  };

  it('should generate markdown with title and metadata', () => {
    const markdown = generateMarkdown(mockContent);

    expect(markdown).toContain('# Test Article');
    expect(markdown).toContain('**Source:** https://example.com/article');
    expect(markdown).toContain('**Generated:**');
  });

  it('should render sections as markdown', () => {
    const markdown = generateMarkdown(mockContent);

    expect(markdown).toContain('# Main Heading');
    expect(markdown).toContain('## Subheading');
    expect(markdown).toContain('This is a paragraph.');
    expect(markdown).toContain('- Item 1');
    expect(markdown).toContain('- Item 2');
    expect(markdown).toContain('1. First');
    expect(markdown).toContain('2. Second');
    expect(markdown).toContain('> A wise quote');
  });

  it('should include footer text if provided', () => {
    const markdown = generateMarkdown(mockContent, { footerText: 'Custom footer' });

    expect(markdown).toContain('---');
    expect(markdown).toContain('Custom footer');
  });

  it('should not include footer separator if no footer text', () => {
    const markdown = generateMarkdown(mockContent);

    expect(markdown).not.toContain('Custom footer');
  });
});

describe('Plain Text Generation', () => {
  const mockContent = {
    title: 'Test Article',
    metadata: {
      url: 'https://example.com/article',
      scrapedAt: '2025-01-15T12:00:00.000Z',
      description: 'Test description'
    },
    sections: [
      { type: 'h1', content: 'Main Heading' },
      { type: 'h2', content: 'Subheading' },
      { type: 'paragraph', content: 'This is a paragraph.' },
      { type: 'bullet-list', items: ['Item 1', 'Item 2'] },
      { type: 'numbered-list', items: ['First', 'Second'] },
      { type: 'quote', content: 'A wise quote' }
    ]
  };

  it('should generate plain text with title underline', () => {
    const text = generatePlainText(mockContent);

    expect(text).toContain('Test Article');
    expect(text).toContain('='.repeat('Test Article'.length));
  });

  it('should include metadata', () => {
    const text = generatePlainText(mockContent);

    expect(text).toContain('Source: https://example.com/article');
    expect(text).toContain('Generated:');
  });

  it('should render sections as plain text', () => {
    const text = generatePlainText(mockContent);

    expect(text).toContain('Main Heading');
    expect(text).toContain('Subheading');
    expect(text).toContain('This is a paragraph.');
    expect(text).toContain('• Item 1');
    expect(text).toContain('• Item 2');
    expect(text).toContain('1. First');
    expect(text).toContain('2. Second');
    expect(text).toContain('"A wise quote"');
  });

  it('should include footer with separator if provided', () => {
    const text = generatePlainText(mockContent, { footerText: 'Custom footer' });

    expect(text).toContain('─'.repeat(50));
    expect(text).toContain('Custom footer');
  });
});

describe('HTML Generation', () => {
  const mockContent = {
    title: 'Test Article',
    metadata: {
      url: 'https://example.com/article',
      scrapedAt: '2025-01-15T12:00:00.000Z',
      description: 'Test description'
    },
    sections: [
      { type: 'h1', content: 'Main Heading' },
      { type: 'paragraph', content: 'Test <script>alert("xss")</script>' }
    ]
  };

  it('should generate valid HTML document', () => {
    const html = generateHTML(mockContent);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('</html>');
  });

  it('should escape HTML in content', () => {
    const html = generateHTML(mockContent);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('should include CSS styles', () => {
    const html = generateHTML(mockContent);

    expect(html).toContain('<style>');
    expect(html).toContain('font-family');
  });

  it('should include footer text if provided', () => {
    const html = generateHTML(mockContent, { footerText: 'Custom footer' });

    expect(html).toContain('Custom footer');
  });
});

describe('Section Rendering', () => {
  it('should render h1 section', () => {
    const section = { type: 'h1', content: 'Title' };
    const result = renderSection(section);
    expect(result).toBe('<h1>Title</h1>');
  });

  it('should render paragraph section', () => {
    const section = { type: 'paragraph', content: 'Text' };
    const result = renderSection(section);
    expect(result).toBe('<p>Text</p>');
  });

  it('should render bullet list section', () => {
    const section = { type: 'bullet-list', items: ['A', 'B'] };
    const result = renderSection(section);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>A</li>');
    expect(result).toContain('<li>B</li>');
  });

  it('should render numbered list section', () => {
    const section = { type: 'numbered-list', items: ['First', 'Second'] };
    const result = renderSection(section);
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
  });

  it('should render quote section', () => {
    const section = { type: 'quote', content: 'Quote' };
    const result = renderSection(section);
    expect(result).toBe('<blockquote>Quote</blockquote>');
  });

  it('should return empty string for unknown section type', () => {
    const section = { type: 'unknown', content: 'Test' };
    const result = renderSection(section);
    expect(result).toBe('');
  });
});
