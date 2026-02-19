import { Module } from "./lessonContent";

export const technicalSeoModule: Module = {
  id: "technical-seo",
  title: "Technical SEO Essentials",
  description: "Master the technical aspects that affect search performance",
  lessons: [
    {
      id: "page-speed-cwv",
      title: "Page Speed & Core Web Vitals",
      duration: "5 min",
      steps: [
        {
          title: "Why Speed Matters",
          content: `Page speed is a confirmed ranking factor. Google's Core Web Vitals measure three aspects of user experience:

**LCP (Largest Contentful Paint)** - How fast the main content loads
• Good: under 2.5 seconds
• Needs work: 2.5-4 seconds
• Poor: over 4 seconds

**FID/INP (Interaction to Next Paint)** - How quickly the page responds to interactions
• Good: under 200 milliseconds

**CLS (Cumulative Layout Shift)** - How much the page layout shifts during loading
• Good: under 0.1`,
          tip: "Focus on LCP first - it has the biggest impact on both rankings and user experience."
        },
        {
          title: "Improving Page Speed",
          content: `Common speed optimizations:

**Images:**
• Compress images (WebP format saves 25-35%)
• Use lazy loading for below-the-fold images
• Specify width and height attributes

**Code:**
• Minify CSS and JavaScript
• Remove unused code
• Defer non-critical scripts

**Server:**
• Enable compression (gzip/brotli)
• Use a CDN for static assets
• Implement browser caching

In the simulator, you'll see how each optimization affects your speed score.`,
          example: `Before optimization:
LCP: 4.2s | CLS: 0.25 | Load: 6.1s

After compressing images + lazy loading:
LCP: 2.1s | CLS: 0.05 | Load: 2.8s

That improvement could move you from page 2 to page 1!`
        }
      ]
    },
    {
      id: "mobile-first-indexing",
      title: "Mobile-First Indexing",
      duration: "5 min",
      steps: [
        {
          title: "What Mobile-First Means",
          content: `Google primarily uses the mobile version of your site for indexing and ranking. This means:

• Your mobile site IS your site in Google's eyes
• Content hidden on mobile may not be indexed
• Mobile usability issues directly hurt rankings
• Desktop-only features might be invisible to Google

If your mobile experience is poor, your rankings suffer—even for desktop searches.`,
          tip: "Always design mobile-first, then enhance for desktop. Not the other way around."
        },
        {
          title: "Mobile Optimization Checklist",
          content: `Ensure your site passes mobile-first requirements:

✓ **Responsive design** - Adapts to all screen sizes
✓ **Readable text** - No pinch-to-zoom needed (16px+ font)
✓ **Tap targets** - Buttons at least 48x48 pixels with spacing
✓ **No horizontal scroll** - Content fits the viewport
✓ **Same content** - Mobile shows everything desktop shows
✓ **Fast loading** - Mobile networks are slower
✓ **No intrusive interstitials** - Pop-ups that block content

In the Technical SEO simulator, toggle mobile-friendliness to see the ranking impact.`,
          example: `Common mobile issues that hurt rankings:
• Menu doesn't work on touch devices
• Images overflow the screen width
• Text is 12px (too small without zooming)
• Buttons are 20x20px (too small to tap accurately)
• Important content loads only via JavaScript that mobile can't execute`
        }
      ]
    },
    {
      id: "crawl-budget-optimization",
      title: "Crawl Budget Optimization",
      duration: "5 min",
      steps: [
        {
          title: "Understanding Crawl Budget",
          content: `Crawl budget is the number of pages search engines will crawl on your site in a given timeframe.

**Why it matters:**
• Limited crawl budget = some pages never get indexed
• Wasting budget on low-value pages hurts important ones
• Large sites feel this most, but small sites aren't immune

**What consumes crawl budget:**
• Every URL the crawler visits (including duplicates)
• Redirect chains (each hop costs a crawl)
• Parameter URLs (?sort=price&color=red)
• Infinite calendar or filter pages`,
          tip: "For a small site (under 1,000 pages), crawl budget usually isn't an issue. Focus on it when you scale."
        },
        {
          title: "Optimizing Your Crawl Budget",
          content: `Maximize the value of every crawl:

**Allow crawling of:**
✓ Important content pages
✓ New and updated content
✓ Category and tag pages with unique content

**Block or limit:**
✗ Admin and login pages
✗ Search results pages
✗ Session-based URLs
✗ Print versions of pages
✗ Faceted navigation with no unique content

Use robots.txt to block, and canonical tags to consolidate duplicates.`,
          example: `robots.txt example:
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /cart/
Disallow: /search?
Sitemap: https://example.com/sitemap.xml`
        }
      ]
    },
    {
      id: "fixing-technical-issues",
      title: "Fixing Common Technical Issues",
      duration: "5 min",
      steps: [
        {
          title: "Identifying Technical Problems",
          content: `The most common technical SEO issues and their impact:

**Critical (fix immediately):**
• 404 errors on important pages
• Incorrect robots.txt blocking content
• Missing or incorrect canonical tags
• HTTPS issues (mixed content)

**Important (fix soon):**
• Broken internal links
• Redirect chains (3+ hops)
• Duplicate content without canonicals
• Missing XML sitemap

**Minor (optimize over time):**
• Missing alt text on images
• Orphan pages (no internal links)
• Suboptimal URL structure`,
          tip: "Start with critical issues. Fixing a robots.txt that blocks your main content can instantly improve indexing."
        },
        {
          title: "Technical SEO Audit Process",
          content: `Follow this systematic audit process:

1. **Crawl your site** - Identify all URLs and their status codes
2. **Check indexation** - Compare crawled pages vs indexed pages
3. **Review robots.txt** - Ensure you're not blocking important pages
4. **Validate sitemaps** - All important pages should be included
5. **Check redirects** - Fix chains and loops
6. **Test mobile** - Verify mobile rendering
7. **Measure speed** - Check Core Web Vitals for all templates

In the simulator, each of these checks maps to a specific score component. Improving one area shows its direct impact on your overall technical SEO score.`,
          example: `Audit findings example:
✗ 12 broken internal links → Fix: update or remove
✗ 3 redirect chains → Fix: point directly to final URL
✗ No canonical on /products?sort=price → Fix: add canonical to /products
✓ robots.txt is correct
✓ Sitemap includes all important pages`
        }
      ]
    }
  ]
};
