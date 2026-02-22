function stripHtml(input = '') {
  return String(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(input = '') {
  return String(input)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractQuotedText(text = '') {
  const match = String(text).match(/"([^"]{20,220})"/);
  if (match?.[1]) return match[1].trim();
  return '';
}

function compact(text = '', max = 180) {
  const cleaned = decodeEntities(stripHtml(text));
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}...`;
}

function looksLikeRawUrl(text = '') {
  const t = String(text || '').trim();
  return /^https?:\/\/\S+$/i.test(t) || /^news\.google\.com\/\S+$/i.test(t);
}

function sanitizeQuoteText(text = '') {
  let q = compact(text, 220);
  if (!q) return '';
  if (looksLikeRawUrl(q)) return '';
  if (q.includes('http://') || q.includes('https://')) {
    q = q.replace(/https?:\/\/\S+/gi, '').trim();
  }
  q = q.replace(/\s+/g, ' ').trim();
  return compact(q, 220);
}

function scoreSentiment(lines = []) {
  const positiveWords = ['surge', 'bull', 'breakout', 'gain', 'rally', 'up', 'positive', 'buy'];
  const negativeWords = ['drop', 'bear', 'sell', 'crash', 'down', 'risk', 'hack', 'scam'];
  let pos = 0;
  let neg = 0;

  for (const line of lines) {
    const lower = String(line || '').toLowerCase();
    for (const w of positiveWords) {
      if (lower.includes(w)) pos += 1;
    }
    for (const w of negativeWords) {
      if (lower.includes(w)) neg += 1;
    }
  }

  const raw = 50 + (pos - neg) * 5;
  const sentimentScore = Math.max(0, Math.min(100, raw));
  const sentimentLabel =
    sentimentScore >= 70 ? 'positive' :
    sentimentScore <= 35 ? 'negative' :
    'neutral';

  return { sentimentScore, sentimentLabel };
}

async function fetchGoogleNewsQuotes(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const xml = await response.text();
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/;
  const sourceRegex = /<source[^>]*>([\s\S]*?)<\/source>/;
  const linkRegex = /<link>([\s\S]*?)<\/link>/;
  const descriptionRegex = /<description>([\s\S]*?)<\/description>/;
  const quotes = [];

  let match;
  while ((match = itemRegex.exec(xml)) !== null && quotes.length < 6) {
    const item = match[1];
    const rawTitle = titleRegex.exec(item)?.[1] || '';
    const rawDescription = descriptionRegex.exec(item)?.[1] || '';
    const source = compact(sourceRegex.exec(item)?.[1] || 'Google News', 60);
    const urlValue = decodeEntities(linkRegex.exec(item)?.[1] || '');
    const title = compact(rawTitle, 220);
    const description = compact(rawDescription, 220);
    const quote = sanitizeQuoteText(extractQuotedText(`${title} ${description}`) || title);
    if (!quote) continue;
    quotes.push({
      quote,
      source,
      source_url: urlValue,
      sentiment_type: 'neutral_news',
    });
  }

  return quotes;
}

async function fetchRedditQuotes(query) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=8&type=link`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'nexus-trade-fast/1.0',
      'Accept': 'application/json',
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const posts = data?.data?.children || [];
  const quotes = [];

  for (const postWrap of posts) {
    if (quotes.length >= 6) break;
    const post = postWrap?.data;
    const title = compact(post?.title || '', 220);
    const body = compact(post?.selftext || '', 220);
    const textForQuote = `${title} ${body}`.trim();
    if (!textForQuote) continue;
    const quote = sanitizeQuoteText(extractQuotedText(textForQuote) || title);
    if (!quote) continue;
    quotes.push({
      quote,
      source: `Reddit r/${post?.subreddit || 'crypto'}`,
      source_url: post?.permalink ? `https://www.reddit.com${post.permalink}` : '',
      sentiment_type: 'social_media',
    });
  }

  return quotes;
}

export async function getTokenSentiment(req) {
  try {
    const { symbol, name } = await req.json().catch(() => ({}));
    const safeSymbol = String(symbol || '').trim();
    const safeName = String(name || '').trim();
    if (!safeSymbol && !safeName) {
      return Response.json({ error: 'Missing symbol or name' }, { status: 400 });
    }

    const query = `${safeName || safeSymbol} ${safeSymbol} crypto`;
    const [newsQuotes, redditQuotes] = await Promise.all([
      fetchGoogleNewsQuotes(query).catch(() => []),
      fetchRedditQuotes(query).catch(() => []),
    ]);

    const allQuotes = [...newsQuotes, ...redditQuotes]
      .filter((q) => q?.quote && !looksLikeRawUrl(q.quote))
      .slice(0, 10);
    const highlights = allQuotes.slice(0, 4).map((q) => `${q.source}: ${q.quote}`);
    const sentimentLines = allQuotes.map((q) => q.quote);
    const { sentimentScore, sentimentLabel } = scoreSentiment(sentimentLines);

    const buzzLevel =
      allQuotes.length >= 8 ? 'very_high' :
      allQuotes.length >= 5 ? 'high' :
      allQuotes.length >= 3 ? 'moderate' :
      allQuotes.length >= 1 ? 'low' :
      'very_low';

    return Response.json({
      sentiment_score: sentimentScore,
      sentiment_label: sentimentLabel,
      buzz_level: buzzLevel,
      news_highlights: highlights,
      news_quotes: allQuotes,
      community_strength: Math.min(100, allQuotes.length * 12),
      concerns: [],
      positive_signals: [],
    });
  } catch (error) {
    console.error('getTokenSentiment error:', error);
    return Response.json({
      error: error?.message || 'Failed to fetch token sentiment',
      sentiment_score: 50,
      sentiment_label: 'neutral',
      buzz_level: 'very_low',
      news_highlights: [],
      news_quotes: [],
      community_strength: 0,
      concerns: [],
      positive_signals: [],
    }, { status: 500 });
  }
}
