import { Module } from "./lessonContent";

export const contentStructureModule: Module = {
  id: "content-structure",
  title: "Content Structure & Hierarchy",
  description: "Learn to structure content for both users and search engines",
  lessons: [
    {
      id: "heading-hierarchy",
      title: "Heading Hierarchy (H1-H6)",
      duration: "5 min",
      steps: [
        {
          title: "Why Heading Structure Matters",
          content: `Headings create the skeleton of your content. Search engines use them to understand page structure and topic hierarchy.

**H1** - Main page topic (one per page)
**H2** - Major sections
**H3** - Subsections within H2
**H4-H6** - Further nesting when needed

A well-structured heading hierarchy helps both users scan content and search engines parse meaning.`,
          tip: "Think of headings like an outline. If you pulled out just the headings, they should tell the full story of your page."
        },
        {
          title: "Common Heading Mistakes",
          content: `Avoid these heading pitfalls:

❌ **Multiple H1s** - Confuses the main topic signal
❌ **Skipping levels** - Going from H2 to H4 breaks hierarchy
❌ **Styling-only headings** - Using H3 because it "looks right" instead of for structure
❌ **Keyword stuffing** - "Best Service | Top Service | Cheap Service Near Me"
❌ **Vague headings** - "More Info" or "Read This"

Each heading should be descriptive and follow a logical nesting order.`,
          example: `✓ Good structure:
H1: Professional Website Audits
  H2: What You Get
    H3: Technical SEO checks
    H3: On-page recommendations
  H2: How It Works
    H3: Data collection
    H3: Prioritized fixes`
        },
        {
          title: "Headings for AEO",
          content: `AI answer engines love question-based headings because they map directly to user queries.

**Transform statements into questions:**
• "How It Works" → "How Does This Process Work?"
• "Support" → "How Do I Get Help?"
• "Pricing" → "How Much Does This Service Cost?"

When AI systems scan your page, question headings with immediate answers are prime candidates for extraction.`,
          tip: "Place a concise 1-2 sentence answer immediately after each question heading before expanding into details."
        }
      ]
    },
    {
      id: "content-readability",
      title: "Content Readability",
      duration: "5 min",
      steps: [
        {
          title: "Writing for the Web",
          content: `Web readers scan, they don't read linearly. Structure your content for scanning:

• **Short paragraphs** - 2-3 sentences max
• **Bullet points** - For lists and features
• **Bold key phrases** - Guide the eye to important info
• **White space** - Give content room to breathe

The average user spends 15 seconds on a page. Make every second count.`,
          tip: "Read your content on a phone. If it looks like a wall of text, break it up."
        },
        {
          title: "Readability and Rankings",
          content: `Search engines favor content that users engage with. Readable content leads to:

• **Lower bounce rates** - Users stay longer
• **Higher dwell time** - More time on page signals quality
• **Better engagement** - Users scroll, click, and interact
• **More shares** - Readable content gets shared more

Aim for a reading level that matches your audience. A marketing site can be conversational; a medical journal can be technical.`,
          example: `❌ Hard to read:
"The utilization of complex methodologies in conjunction with specialized terminology produces outcomes of exceptional perceived quality."

✓ Easy to read:
"We use a clear process and simple language to deliver results you can measure."`
        }
      ]
    },
    {
      id: "internal-linking-strategy",
      title: "Internal Linking Strategy",
      duration: "5 min",
      steps: [
        {
          title: "How Internal Links Work",
          content: `Internal links connect your pages and distribute ranking power (called "link equity") throughout your site.

**Key functions of internal links:**
• Help crawlers discover new pages
• Establish content hierarchy and relationships
• Pass authority from strong pages to weaker ones
• Guide users through your content

Every page should be reachable within 3 clicks from the homepage.`,
          tip: "Your most important pages should have the most internal links pointing to them."
        },
        {
          title: "Anchor Text Best Practices",
          content: `The clickable text of a link (anchor text) tells search engines what the target page is about.

**Good anchor text:**
✓ Descriptive: "our technical audit checklist"
✓ Natural: "learn about our process"
✓ Relevant: matches the target page content

**Bad anchor text:**
✗ Generic: "click here" or "read more"
✗ Over-optimized: exact keyword repeated everywhere
✗ Misleading: anchor doesn't match destination

Vary your anchor text naturally while keeping it descriptive.`,
          example: `Linking to your pricing page:
✓ "View our pricing"
✓ "See plans and pricing"  
✓ "pricing options"
✗ "click here"
✗ "best pricing cheap pricing best price pricing"`
        }
      ]
    }
  ]
};
