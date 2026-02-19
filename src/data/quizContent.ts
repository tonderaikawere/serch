export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const lessonQuizzes: Record<string, QuizQuestion[]> = {
  // Search Fundamentals
  "search-fundamentals/how-search-engines-work": [
    {
      question: "What are the three fundamental tasks search engines perform?",
      options: [
        "Crawling, Indexing, Ranking",
        "Scanning, Storing, Sorting",
        "Reading, Writing, Displaying",
        "Fetching, Parsing, Rendering"
      ],
      correctIndex: 0,
      explanation: "Search engines crawl (discover pages), index (organize content), and rank (determine relevance for queries)."
    },
    {
      question: "Why might a crawled page NOT be indexed?",
      options: [
        "It has too many images",
        "It uses a noindex meta tag or has thin content",
        "It loads too quickly",
        "It has too many headings"
      ],
      correctIndex: 1,
      explanation: "Pages blocked by noindex tags, with duplicate/thin content, or with technical errors may not be indexed even after crawling."
    }
  ],
  "search-fundamentals/crawling-indexing-explained": [
    {
      question: "What is 'crawl budget'?",
      options: [
        "The cost of running a search engine",
        "The number of pages a search engine will crawl in a given timeframe",
        "The amount of money spent on SEO",
        "The time it takes to build a website"
      ],
      correctIndex: 1,
      explanation: "Crawl budget is the number of pages search engines allocate to crawl on your site within a specific period."
    }
  ],
  "search-fundamentals/the-ranking-process": [
    {
      question: "Which of these is NOT a core ranking principle?",
      options: [
        "Relevance",
        "Authority",
        "Page color scheme",
        "User Experience"
      ],
      correctIndex: 2,
      explanation: "Rankings depend on relevance, authority, and user experience. Visual design choices like color schemes don't directly affect ranking."
    }
  ],

  // Keywords & Intent
  "keywords-intent/keywords-vs-entities": [
    {
      question: "How do entities differ from keywords?",
      options: [
        "Entities are longer keywords",
        "Entities are real-world things that search engines understand contextually",
        "Entities only apply to people's names",
        "There is no difference"
      ],
      correctIndex: 1,
      explanation: "Entities represent real-world concepts (people, places, things) that search engines can disambiguate using context, unlike simple text-string keywords."
    }
  ],
  "keywords-intent/understanding-search-intent": [
    {
      question: "A user searching 'best laptops 2024' has what type of intent?",
      options: [
        "Navigational",
        "Transactional",
        "Informational",
        "Commercial Investigation"
      ],
      correctIndex: 3,
      explanation: "The user is researching before buying — comparing options. This is commercial investigation intent, best served by comparison articles and reviews."
    }
  ],
  "keywords-intent/informational-vs-transactional": [
    {
      question: "A user searching 'buy running shoes online' has what type of intent?",
      options: [
        "Informational",
        "Navigational",
        "Transactional",
        "Commercial Investigation"
      ],
      correctIndex: 2,
      explanation: "The word 'buy' signals clear transactional intent — the user is ready to purchase and wants a product page with ordering capability."
    },
    {
      question: "What is the best content format for an informational query?",
      options: [
        "Product page with Add to Cart button",
        "Long-form guide, tutorial, or how-to article",
        "Checkout page with pricing",
        "Contact form"
      ],
      correctIndex: 1,
      explanation: "Informational queries are best served by educational content like guides and tutorials that build trust and demonstrate expertise."
    }
  ],
  "keywords-intent/building-keyword-clusters": [
    {
      question: "What is the main benefit of keyword clustering?",
      options: [
        "Using more keywords on a single page",
        "Avoiding keyword cannibalization and building topical authority",
        "Making pages longer",
        "Getting more backlinks"
      ],
      correctIndex: 1,
      explanation: "Clustering prevents multiple pages from competing for the same queries and signals to search engines that you're an authority on the entire topic."
    },
    {
      question: "In a pillar-cluster model, what does the pillar page do?",
      options: [
        "Lists all keywords",
        "Provides a comprehensive topic overview linking to deeper subtopic pages",
        "Contains only images",
        "Blocks crawlers from subtopic pages"
      ],
      correctIndex: 1,
      explanation: "The pillar page is the comprehensive hub that covers the broad topic and links to all cluster pages, which dive deeper into subtopics."
    }
  ],

  "aeo-fundamentals/what-is-aeo": [
    {
      question: "What does AEO stand for?",
      options: [
        "Automated Engine Output",
        "Answer Engine Optimization",
        "Advanced Entity Organization",
        "AI Engine Operations"
      ],
      correctIndex: 1,
      explanation: "AEO stands for Answer Engine Optimization — preparing content to be selected and quoted by AI-powered answer systems."
    }
  ],
  "aeo-fundamentals/how-ai-extracts-answers": [
    {
      question: "Which content format is BEST for AI answer extraction?",
      options: [
        "Long narrative paragraphs",
        "Question heading followed by a direct 1-2 sentence answer",
        "Content hidden behind tabs",
        "All-caps text for emphasis"
      ],
      correctIndex: 1,
      explanation: "AI systems look for clear question-answer patterns. A question heading with an immediate concise answer is the most extractable format."
    }
  ],
  "aeo-fundamentals/writing-for-featured-snippets": [
    {
      question: "What is the ideal word count for a paragraph featured snippet?",
      options: [
        "10-20 words",
        "40-60 words",
        "200-300 words",
        "500+ words"
      ],
      correctIndex: 1,
      explanation: "Paragraph featured snippets typically display 40-60 words. Keeping your answer within this range maximizes extraction chances."
    },
    {
      question: "Which page positions are eligible for featured snippets?",
      options: [
        "Only position #1",
        "Positions 1-10 (first page of results)",
        "Any position",
        "Only pages with schema markup"
      ],
      correctIndex: 1,
      explanation: "Pages ranking in the top 10 results are eligible for featured snippets. Even a #5 result can win Position 0."
    }
  ],
  "aeo-fundamentals/faq-qa-optimization": [
    {
      question: "What makes FAQ sections particularly effective for AEO?",
      options: [
        "They contain lots of keywords",
        "They naturally match how people search and are easily extractable by AI",
        "They make pages longer",
        "They improve page speed"
      ],
      correctIndex: 1,
      explanation: "FAQs mirror natural language queries and provide self-contained, clearly structured answers that AI systems can easily identify and extract."
    },
    {
      question: "What is the optimal answer length for AI extraction in a Q&A pair?",
      options: [
        "5-10 words",
        "40-80 words",
        "200-300 words",
        "500+ words"
      ],
      correctIndex: 1,
      explanation: "Answers between 40-80 words are optimal — concise enough for AI extraction while detailed enough to fully answer the question."
    }
  ],

  // Content Structure
  "content-structure/heading-hierarchy": [
    {
      question: "How many H1 tags should a page typically have?",
      options: ["As many as needed", "One", "Two", "None"],
      correctIndex: 1,
      explanation: "Each page should have exactly one H1 that clearly communicates the main topic. Multiple H1s dilute the primary topic signal."
    }
  ],
  "content-structure/content-readability": [
    {
      question: "Why does content readability affect SEO rankings?",
      options: [
        "Search engines can read faster",
        "Readable content leads to better user engagement signals",
        "It doesn't affect rankings",
        "Google counts the number of bullet points"
      ],
      correctIndex: 1,
      explanation: "Readable content improves dwell time, reduces bounce rates, and increases engagement — all signals that search engines use for ranking."
    }
  ],
  "content-structure/internal-linking-strategy": [
    {
      question: "What is the recommended maximum click depth from the homepage?",
      options: ["1 click", "3 clicks", "10 clicks", "No limit"],
      correctIndex: 1,
      explanation: "Every important page should be reachable within 3 clicks from the homepage to ensure both crawlers and users can find it easily."
    }
  ],

  // Structured Data
  "structured-data/intro-to-schema": [
    {
      question: "What format does Google recommend for structured data?",
      options: ["XML", "JSON-LD", "Microdata", "CSV"],
      correctIndex: 1,
      explanation: "Google recommends JSON-LD (JavaScript Object Notation for Linked Data) as the preferred format for structured data markup."
    }
  ],
  "structured-data/faq-schema": [
    {
      question: "Can FAQ schema be added to pages other than a dedicated FAQ page?",
      options: [
        "No, only on /faq pages",
        "Yes, on any page that contains visible Q&A content",
        "Only on the homepage",
        "Only on blog posts"
      ],
      correctIndex: 1,
      explanation: "FAQ schema works on any page with question-answer content — product pages, service pages, blog posts, and more."
    }
  ],
  "structured-data/article-product-schema": [
    {
      question: "Which Product schema property unlocks star ratings in search results?",
      options: ["description", "sku", "aggregateRating", "brand"],
      correctIndex: 2,
      explanation: "The aggregateRating property enables star ratings to appear in search result snippets, making your listing more eye-catching."
    }
  ],

  // Technical SEO
  "technical-seo/page-speed-cwv": [
    {
      question: "What does LCP measure?",
      options: [
        "How many links are on the page",
        "How fast the largest content element loads",
        "Total page file size",
        "Number of CSS files"
      ],
      correctIndex: 1,
      explanation: "LCP (Largest Contentful Paint) measures how quickly the main content element (hero image, heading block) becomes visible to the user."
    }
  ],
  "technical-seo/mobile-first-indexing": [
    {
      question: "With mobile-first indexing, which version of your site does Google primarily use?",
      options: ["Desktop", "Mobile", "Tablet", "The fastest version"],
      correctIndex: 1,
      explanation: "Google uses the mobile version of your site as the primary source for indexing and ranking, regardless of the device searching."
    }
  ],
  "technical-seo/crawl-budget-optimization": [
    {
      question: "Which type of page should you BLOCK from crawling?",
      options: [
        "Your homepage",
        "Blog posts",
        "Admin and login pages",
        "Product pages"
      ],
      correctIndex: 2,
      explanation: "Admin panels, login pages, and other utility pages waste crawl budget and provide no value in search results."
    }
  ],
  "technical-seo/fixing-technical-issues": [
    {
      question: "Which issue should be fixed FIRST?",
      options: [
        "Missing image alt text",
        "Robots.txt blocking main content",
        "Suboptimal URL structure",
        "Orphan pages"
      ],
      correctIndex: 1,
      explanation: "A robots.txt blocking main content is critical — it prevents your pages from being crawled and indexed at all. Fix this immediately."
    }
  ]
};
