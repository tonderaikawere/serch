import { Module } from "./lessonContent";

export const structuredDataModule: Module = {
  id: "structured-data",
  title: "Structured Data & Schema",
  description: "Help search engines understand your content with schema markup",
  lessons: [
    {
      id: "intro-to-schema",
      title: "Introduction to Schema.org",
      duration: "5 min",
      steps: [
        {
          title: "What Is Structured Data?",
          content: `Structured data is code you add to your pages to help search engines understand your content explicitly.

Instead of guessing what your page is about, structured data tells engines:
• "This is a **Recipe** for chocolate cake"
• "This is a **LocalBusiness** open 9-5"
• "This is an **Article** published on March 1st"

The most common format is **JSON-LD** (JavaScript Object Notation for Linked Data), which Google recommends.`,
          tip: "Think of structured data as filling out a form for search engines. You're giving them organized facts instead of making them parse your prose."
        },
        {
          title: "Common Schema Types",
          content: `The most impactful schema types for SEO:

**LocalBusiness** - Name, address, hours, phone
**FAQ** - Question and answer pairs
**Article** - Author, date, headline
**Product** - Price, availability, reviews
**BreadcrumbList** - Navigation path
**HowTo** - Step-by-step instructions

Each type can unlock rich results in search - enhanced listings with stars, prices, images, and more.`,
          example: `A service website might use:
• LocalBusiness schema on the homepage
• FAQ schema on a support page
• Product schema on plan or offering pages
• BreadcrumbList on every page for navigation`
        }
      ]
    },
    {
      id: "faq-schema",
      title: "FAQ Schema Implementation",
      duration: "5 min",
      steps: [
        {
          title: "Why FAQ Schema Matters",
          content: `FAQ schema is one of the most powerful schema types because:

1. **Rich results** - Questions appear directly in search results
2. **More SERP space** - Your listing takes up more room
3. **AEO boost** - AI engines love structured Q&A data
4. **Voice search** - FAQ answers are ideal for voice assistants

FAQ schema works for any page with question-answer content, not just dedicated FAQ pages.`,
          tip: "You can add FAQ schema to product pages, service pages, and blog posts - anywhere you answer common questions."
        },
        {
          title: "Building FAQ JSON-LD",
          content: `FAQ schema structure is straightforward:

1. Set @type to "FAQPage"
2. Add a "mainEntity" array
3. Each entry has @type "Question" with "name" and "acceptedAnswer"
4. Each answer has @type "Answer" with "text"

**Rules to follow:**
• Only use questions actually visible on the page
• Don't use FAQ schema for advertising
• Keep answers concise but complete
• HTML is allowed in answer text`,
          example: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How long does delivery take?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Delivery typically takes 2-5 business days, depending on your location."
    }
  }]
}`
        }
      ]
    },
    {
      id: "article-product-schema",
      title: "Article & Product Schema",
      duration: "5 min",
      steps: [
        {
          title: "Article Schema",
          content: `Article schema helps search engines understand your blog posts and news content:

**Key properties:**
• headline - The article title
• author - Who wrote it (links to Person schema)
• datePublished / dateModified - Freshness signals
• image - Featured image
• description - Summary

Article schema enables rich results with publication dates, author photos, and breadcrumbs.`,
          tip: "Always include dateModified when you update content. It signals freshness to search engines."
        },
        {
          title: "Product Schema",
          content: `Product schema unlocks the richest search results:

**Essential properties:**
• name - Product name
• description - Product description
• image - Product photos
• offers - Price, currency, availability

**Optional but powerful:**
• aggregateRating - Star ratings
• review - Individual reviews
• brand - Brand name
• sku - Unique identifier

Products with schema markup get star ratings, prices, and availability badges in search results.`,
          example: `For a product offering:
• name: "Website Audit"
• price: "$199"
• availability: "InStock"
• aggregateRating: 4.8/5 from 42 reviews

This creates a rich snippet showing the price and stars right in search results.`
        }
      ]
    }
  ]
};
