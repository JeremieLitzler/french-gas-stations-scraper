import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

const ALLOWED_DOMAINS = ['www.prix-carburants.gouv.fr']

interface FetchArticleResponse {
  success: boolean
  html?: string
  error?: string
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    }
  }

  // Get URL from query parameters
  const url = event.queryStringParameters?.url

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Missing url parameter' }),
    }
  }

  // Validate URL format
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Invalid URL format' }),
    }
  }

  // Validate domain is whitelisted
  if (!ALLOWED_DOMAINS.includes(urlObj.hostname)) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        success: false,
        error: `Domain not allowed. Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`,
      }),
    }
  }

  // Fetch HTML from blog
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'french-gas-stations-scraper/1.0',
      },
    })

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: `Failed to fetch: ${response.status} ${response.statusText}`,
        }),
      }
    }

    const html = await response.text()

    const responseBody: FetchArticleResponse = {
      success: true,
      html,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseBody),
    }
  } catch (error) {
    console.error('Error fetching article:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    }
  }
}
