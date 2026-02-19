import { contentStructureModule } from "./contentStructureLessons";
import { structuredDataModule } from "./structuredDataLessons";
import { technicalSeoModule } from "./technicalSeoLessons";

export interface LessonStep {
  title: string;
  content: string;
  tip?: string;
  example?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  steps: LessonStep[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export const lessonContent: Record<string, Module> = {
  "search-fundamentals": {
    id: "search-fundamentals",
    title: "Search Fundamentals",
    description: "Understand how search engines discover, crawl, and index web content",
    lessons: [
      {
        id: "how-search-engines-work",
        title: "How Search Engines Work",
        duration: "5 min",
        steps: [
          {
            title: "The Three Pillars of Search",
            content: `Search engines perform three fundamental tasks to deliver relevant results:

1. **Crawling** - Discovering new and updated pages across the web
2. **Indexing** - Organizing and storing page content in a massive database
3. **Ranking** - Determining which pages best answer a user's query

Understanding these pillars is essential for optimizing your content to be found, understood, and ranked highly.`,
            tip: "Think of search engines like librarians: they collect books (crawling), organize them by topic (indexing), and recommend the best ones when asked (ranking)."
          },
          {
            title: "How Crawlers Discover Content",
            content: `Search engine crawlers (also called "bots" or "spiders") follow links from page to page to discover content.

When a crawler visits your page, it:
• Reads the HTML content
• Follows internal and external links
• Notes images, videos, and other media
• Records when the page was last updated

The more links pointing to your page, the more likely crawlers will find it quickly.`,
            example: `If your homepage links to /about and /services, crawlers will follow those links and discover those pages. If /about links to /team, that page gets discovered too.`
          },
          {
            title: "What Gets Indexed",
            content: `After crawling, search engines decide what to store in their index. Not everything makes the cut.

Pages may NOT be indexed if they:
• Block crawlers via robots.txt
• Use "noindex" meta tags
• Have very thin or duplicate content
• Load too slowly or have technical errors

Pages that ARE indexed get analyzed for:
• Main topics and keywords
• Content quality and depth
• Structured data and metadata`,
            tip: "Just because your page is crawled doesn't mean it's indexed. Use search console tools to verify indexation status."
          }
        ]
      },
      {
        id: "crawling-indexing-explained",
        title: "Crawling & Indexing Explained",
        duration: "5 min",
        steps: [
          {
            title: "The Crawl Budget",
            content: `Search engines allocate a "crawl budget" to each website - the number of pages they'll crawl in a given timeframe.

Factors affecting your crawl budget:
• Site size and update frequency
• Server response speed
• Internal linking structure
• Overall site authority

Larger, authoritative sites get more crawl budget. New sites need to earn it.`,
            tip: "Don't waste crawl budget on low-value pages. Use robots.txt to prevent crawling of admin panels, duplicate content, and utility pages."
          },
          {
            title: "Optimizing for Crawlers",
            content: `Make it easy for crawlers to access your content:

✓ Submit an XML sitemap listing important pages
✓ Ensure fast server response times
✓ Fix broken links and redirect chains
✓ Use clear internal linking hierarchies
✓ Keep your robots.txt file accurate

The easier you make it for crawlers, the better your pages will be discovered and indexed.`,
            example: `A clean URL structure like:
/products/shoes/running-shoes
is better than:
/index.php?cat=3&subcat=7&id=142`
          },
          {
            title: "Index Quality Signals",
            content: `When indexing your content, search engines evaluate quality signals:

**Content Signals:**
• Originality and uniqueness
• Depth and comprehensiveness
• Proper formatting (headings, lists, paragraphs)

**Technical Signals:**
• Mobile-friendliness
• Page load speed
• Secure connection (HTTPS)
• Proper canonical tags

Focus on both content quality AND technical excellence for the best indexing results.`,
            tip: "Create content that deserves to be indexed. Ask yourself: does this page provide real value that no other page offers?"
          }
        ]
      },
      {
        id: "the-ranking-process",
        title: "The Ranking Process",
        duration: "5 min",
        steps: [
          {
            title: "How Rankings Are Determined",
            content: `Ranking is where indexed pages compete for visibility. Search engines use hundreds of ranking factors, but the core principles are:

**Relevance** - How well does your page match the query?
**Authority** - How trustworthy is your content and site?
**User Experience** - How easy is it to use and navigate?

These three pillars work together. A page might be highly relevant but rank poorly if the site lacks authority.`,
            tip: "Focus on being the best answer to a specific question rather than trying to rank for everything."
          },
          {
            title: "Relevance Signals",
            content: `Search engines determine relevance through:

• **Keywords** - Strategic placement in titles, headings, and content
• **Semantic understanding** - Related terms and concepts
• **Search intent match** - Does your content type match what users want?
• **Freshness** - Is your content up-to-date for time-sensitive queries?

Modern search engines understand context, not just keywords. "Best running shoes 2024" is understood to want reviews and comparisons, not just pages mentioning those words.`,
            example: `Query: "how to tie a tie"
High relevance: Step-by-step guide with images
Low relevance: History of neckties article`
          },
          {
            title: "Building Authority",
            content: `Authority is earned through:

• **Backlinks** - Links from other reputable sites
• **Brand mentions** - Being cited as a source
• **Expert authors** - Content by recognized authorities
• **E-E-A-T** - Experience, Expertise, Authoritativeness, Trustworthiness

Authority takes time to build. Focus on creating genuinely valuable content that others want to reference and share.

As you progress, focus on improving content quality and earning relevant links to strengthen authority over time.`,
            tip: "Quality backlinks from relevant sites are worth more than dozens of random links. One link from an industry leader can outweigh 100 from unknown blogs."
          }
        ]
      }
    ]
  },
  "keywords-intent": {
    id: "keywords-intent",
    title: "Keywords & Search Intent",
    description: "Master keyword research and understand what users really want",
    lessons: [
      {
        id: "keywords-vs-entities",
        title: "Keywords vs Entities",
        duration: "5 min",
        steps: [
          {
            title: "Beyond Simple Keywords",
            content: `Traditional SEO focused on exact keyword matches. Modern search understands **entities** - specific things, concepts, or ideas.

**Keywords** = text strings users type
**Entities** = real-world things search engines understand

Example: "Apple" as a keyword could mean the fruit or the company. As an entity, search engines know the difference based on context.`,
            tip: "Think about WHAT you're writing about, not just the words you use. Search engines understand concepts, not just text."
          },
          {
            title: "Entity-Based Optimization",
            content: `To optimize for entities:

1. **Be specific** - "Apple iPhone 15 Pro" vs just "phone"
2. **Provide context** - Surrounding text helps identify the entity
3. **Use structured data** - Schema markup explicitly defines entities
4. **Connect related entities** - Link concepts together naturally

Search engines maintain knowledge graphs connecting entities. Your content should help reinforce these connections.`,
            example: `"Tesla" the entity is connected to:
• Elon Musk (founder)
• Electric vehicles (product category)
• Austin, Texas (headquarters)
• TSLA (stock symbol)

Mentioning related entities strengthens your content's relevance.`
          }
        ]
      },
      {
        id: "understanding-search-intent",
        title: "Understanding Search Intent",
        duration: "5 min",
        steps: [
          {
            title: "The Four Types of Intent",
            content: `Every search has an underlying intent:

**Informational** - User wants to learn something
"What is SEO?" / "How to improve website performance"

**Navigational** - User wants a specific website
"Facebook login" / "OpenAI blog"

**Transactional** - User wants to buy something
"Buy iPhone 15" / "Nike shoes discount"

**Commercial Investigation** - User is researching before buying
"Best laptops 2024" / "iPhone vs Samsung comparison"

Match your content type to the dominant intent for your target keywords.`,
            tip: "Search the keyword yourself and look at what's ranking. That tells you what intent Google thinks is behind that query."
          },
          {
            title: "Content-Intent Alignment",
            content: `Different intents require different content formats:

**Informational** → Guides, tutorials, explanations
**Navigational** → Clear homepage, strong brand presence
**Transactional** → Product pages, pricing, buy buttons
**Commercial** → Comparisons, reviews, "best of" lists

Misaligned content rarely ranks well. A product page won't rank for "how to choose a laptop" no matter how optimized.`,
            example: `Query: "best project management tool"
✗ Product page for one tool
✓ Comparison article reviewing multiple options

Query: "buy Notion plan"
✓ Pricing page with plan details and checkout
✗ General article about note-taking apps`
          }
        ]
      },
      {
        id: "informational-vs-transactional",
        title: "Informational vs Transactional Queries",
        duration: "5 min",
        steps: [
          {
            title: "Recognizing Query Types",
            content: `Queries fall on a spectrum from pure information-seeking to ready-to-buy:

**Informational queries** signal learning intent:
• "What is Core Web Vitals?"
• "How long does it take to publish a page?"
• "Benefits of using structured data"

**Transactional queries** signal buying intent:
• "Buy running shoes online"
• "Best laptop deals near me"
• "Order same-day delivery"

The words users choose reveal where they are in the buying journey. "How to" = learning. "Buy" / "order" / "near me" = ready to act.`,
            tip: "Map each page on your site to a primary query type. Don't try to sell on an informational page or educate on a checkout page."
          },
          {
            title: "Matching Content to Query Type",
            content: `Each query type demands a different content format:

**Informational → Educate**
• Long-form guides, tutorials, how-to articles
• Use headings as questions (great for AEO)
• Include visuals, steps, and examples
• Goal: build trust and authority

**Transactional → Convert**
• Product pages with clear pricing
• Strong calls-to-action above the fold
• Trust signals (reviews, guarantees, secure checkout)
• Goal: remove friction and close the sale

**Hybrid pages** try to do both and usually fail at both. Keep your intent focus clear.`,
            example: `Query: "best website builder"
→ Intent: Commercial investigation (leaning informational)
→ Best content: Comparison guide reviewing multiple platforms
→ Wrong content: Landing page for one platform only

Query: "buy website hosting"
→ Intent: Transactional
→ Best content: Pricing page with checkout
→ Wrong content: Blog post about hosting history`
          }
        ]
      },
      {
        id: "building-keyword-clusters",
        title: "Building Keyword Clusters",
        duration: "5 min",
        steps: [
          {
            title: "What Are Keyword Clusters?",
            content: `A keyword cluster is a group of semantically related keywords that share the same search intent and can be targeted by a single page.

**Why cluster instead of targeting one keyword per page?**
• Modern search engines understand topics, not just individual keywords
• One well-optimized page can rank for dozens of related terms
• Avoids keyword cannibalization (multiple pages competing for the same query)
• Creates stronger topical authority

**Example cluster for a service business:**
Pillar: "website audit"
Cluster: "site audit checklist," "technical SEO audit," "website health check," "SEO audit report," "on-page audit"`,
            tip: "Group keywords by intent first, then by topic. Two keywords with different intents belong in different clusters even if the words look similar."
          },
          {
            title: "Building Your Cluster Strategy",
            content: `Follow this process to create effective clusters:

1. **Collect seed keywords** — Start with your core topics
2. **Expand with variations** — Add synonyms, long-tail, and related terms
3. **Group by intent** — Separate informational from transactional
4. **Assign to pages** — One cluster per page (pillar or supporting)
5. **Map internal links** — Connect cluster pages to the pillar page

**Pillar-Cluster Model:**
• Pillar page = comprehensive topic overview
• Cluster pages = deep dives into subtopics
• Internal links connect them all

This structure signals to search engines that you're an authority on the entire topic, not just one keyword.`,
            example: `Pillar page: "Complete Guide to Website Audits"
Cluster pages:
├── "Technical SEO Audit: Step-by-Step"
├── "On-Page SEO Audit Checklist"
├── "How to Find Crawl Errors"
├── "How to Fix Duplicate Content"
└── "Top Tools for SEO Audits"

Each cluster page links back to the pillar, and the pillar links to all clusters.`
          }
        ]
      }
    ]
  },
  "aeo-fundamentals": {
    id: "aeo-fundamentals",
    title: "AEO Fundamentals",
    description: "Optimize content for AI-powered answer engines",
    lessons: [
      {
        id: "what-is-aeo",
        title: "What is Answer Engine Optimization?",
        duration: "5 min",
        steps: [
          {
            title: "The Rise of AI Answers",
            content: `Answer Engine Optimization (AEO) prepares your content to be selected and quoted by AI systems.

Unlike traditional search, AI answer engines:
• Generate direct answers instead of link lists
• Synthesize information from multiple sources
• Quote or paraphrase your content directly
• May or may not cite the source

Your content needs to be structured so AI systems can extract clear, accurate answers.`,
            tip: "Write content that sounds natural when read aloud. AI systems often prefer conversational, clear explanations."
          },
          {
            title: "AEO vs Traditional SEO",
            content: `While SEO and AEO overlap, key differences exist:

**SEO Focus:**
• Ranking in search results
• Earning clicks to your site
• Competing for position #1

**AEO Focus:**
• Being the source of direct answers
• Clear, extractable statements
• Structured data for AI understanding
• Featured snippet optimization

The best strategy optimizes for both. AEO-friendly content often performs well in traditional search too.`,
            example: `SEO-optimized: "Learn about the many benefits of meditation..."
AEO-optimized: "Meditation provides three main benefits: reduced stress, improved focus, and better sleep quality."`
          }
        ]
      },
      {
        id: "how-ai-extracts-answers",
        title: "How AI Extracts Answers",
        duration: "5 min",
        steps: [
          {
            title: "What Makes Content Extractable",
            content: `AI systems look for specific patterns when extracting answers:

**Clear definitions** - "X is..." or "X refers to..."
**Direct answers** - Question in heading, answer immediately following
**Lists and steps** - Numbered or bulleted formats
**Concise summaries** - Key points in 1-3 sentences

Structure your content with extraction in mind. Front-load important information.`,
            tip: "After each heading that poses a question, provide a direct 1-2 sentence answer before expanding on details."
          },
          {
            title: "Content Structure for AI",
            content: `Optimize your content structure:

1. **Use question headings** - Match how users ask
2. **Answer immediately** - Don't bury the answer
3. **Be specific** - Avoid vague language
4. **Use formatting** - Lists, tables, definitions
5. **Include context** - Help AI understand the topic

Think of your content as a database of answers, each one clearly labeled and easy to extract.`,
            example: `❌ Poor for AEO:
"There are many things to consider when discussing what SEO actually means in today's digital landscape..."

✓ Good for AEO:
"SEO stands for Search Engine Optimization. It's the practice of improving your website to increase visibility in search engine results."`
          }
        ]
      },
      {
        id: "writing-for-featured-snippets",
        title: "Writing for Featured Snippets",
        duration: "5 min",
        steps: [
          {
            title: "What Are Featured Snippets?",
            content: `Featured snippets are the highlighted answer boxes that appear at the top of Google search results — "Position 0."

**Types of featured snippets:**
• **Paragraph** — A direct text answer (40-60 words)
• **List** — Numbered steps or bullet points
• **Table** — Data comparison in rows and columns
• **Video** — A video clip with a timestamp

Featured snippets are the bridge between traditional SEO and AEO. If your content wins a snippet, AI answer engines are also more likely to quote you.`,
            tip: "Pages ranking in positions 1-10 are eligible for featured snippets. You don't need to be #1 — even a #5 result can win the snippet."
          },
          {
            title: "Snippet Optimization Tactics",
            content: `Structure your content to win snippets:

**For paragraph snippets:**
• Use the target question as an H2/H3 heading
• Answer in the first 1-2 sentences directly below
• Keep the answer between 40-60 words
• Be factual and definitive — avoid "it depends"

**For list snippets:**
• Use H2 for the topic, then ordered/unordered list
• Each list item should be concise (one line)
• Include 5-8 items for optimal extraction

**For table snippets:**
• Use proper HTML <table> elements
• Include clear column headers
• Keep data consistent and comparable`,
            example: `Target query: "What is SEO?"

❌ Poor snippet candidate:
"SEO has a long and fascinating history. Many people use it for various reasons..."

✓ Strong snippet candidate:
"SEO stands for Search Engine Optimization. It's the practice of improving a website so it ranks higher in search results, earns more qualified traffic, and provides a better user experience."`
          }
        ]
      },
      {
        id: "faq-qa-optimization",
        title: "FAQ & Q&A Optimization",
        duration: "5 min",
        steps: [
          {
            title: "Why FAQs Are AEO Gold",
            content: `FAQ sections are one of the most powerful tools for AEO because they naturally match how people search:

**Why AI loves FAQs:**
• Questions mirror natural language queries
• Answers are self-contained and extractable
• Structure is clear and predictable
• Schema markup makes them machine-readable

**Where to add FAQs:**
• Dedicated FAQ page (for general business questions)
• Product pages (for product-specific questions)
• Service pages (for service-related queries)
• Blog posts (for topic-specific questions)

The key is making each Q&A pair genuinely useful — not stuffing questions for SEO.`,
            tip: "Use your site's search data and customer support tickets to find real questions people ask. These make the best FAQ content."
          },
          {
            title: "Crafting Perfect Q&A Pairs",
            content: `Follow these rules for each Q&A pair:

**Questions should:**
• Use natural language ("How do I...?" not "Information regarding...")
• Target one specific topic per question
• Match real search queries (check Google's "People Also Ask")
• Start with Who, What, When, Where, Why, or How

**Answers should:**
• Lead with the direct answer in the first sentence
• Stay between 40-80 words for optimal extraction
• Include one specific fact, number, or example
• Avoid linking away (keep the answer self-contained)

**Then add FAQ Schema:**
• Wrap each Q&A pair in FAQPage structured data
• This makes your content eligible for rich results
• AI engines can parse schema directly for answers`,
            example: `Good Q&A pair:

Q: "How long does it take for SEO changes to show results?"
A: "SEO changes typically take 2-8 weeks to show measurable impact, depending on your site's authority, crawl frequency, and the size of the update. Small on-page edits can be picked up sooner, while major content changes and link growth usually take longer. Track progress in Search Console and analytics to confirm improvements."

This works because:
✓ Direct answer in first sentence (2-8 weeks)
✓ Specific and factual
✓ Includes a next step (what to track)
✓ 52 words — perfect extraction length`
          }
        ]
      }
    ]
  },
  "content-structure": contentStructureModule,
  "structured-data": structuredDataModule,
  "technical-seo": technicalSeoModule,
};

export function getLessonContent(moduleId: string, lessonId: string): { module: Module; lesson: Lesson } | null {
  const module = lessonContent[moduleId];
  if (!module) return null;
  
  const lesson = module.lessons.find(l => l.id === lessonId);
  if (!lesson) return null;
  
  return { module, lesson };
}

export function getModuleProgress(moduleId: string, completedLessons: string[]): number {
  const module = lessonContent[moduleId];
  if (!module) return 0;
  
  const completed = module.lessons.filter(l => 
    completedLessons.includes(`${moduleId}/${l.id}`)
  ).length;
  
  return Math.round((completed / module.lessons.length) * 100);
}
