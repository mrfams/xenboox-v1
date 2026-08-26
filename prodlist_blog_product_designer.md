# Product Designer Analysis — Blog Page

## Loop 1: DISCOVER

### User Problem

SMEs and accounting professionals need to find educational content, product updates, and industry insights. The Blog page must be a content hub that drives traffic, builds authority, and generates leads.

### Current Experience (Based on PM Analysis)

- PM identified 6 key patterns: OpenAI, Anthropic, Digits, QuickBooks, Xero, Stripe
- Blog structure: /blog + /blog/[slug]
- Categories: Product, Engineering, AI, Accounting, Company

### Pain Points to Address

1. **Content discovery** — Users need to find relevant content quickly
2. **Content credibility** — Users need to trust the content
3. **Content engagement** — Users need to stay and read
4. **Content conversion** — Users need to take action after reading
5. **Mobile experience** — Must work perfectly on all devices

---

## Loop 2: DEFINE

### Problem Frame

**FOR** SMEs and accounting professionals
**WHO** need educational content and product updates
**WE NEED** a blog that drives traffic, builds authority, and generates leads
**BECAUSE** content marketing is the #1 channel for B2B SaaS
**SUCCESS METRIC:** 10,000+ monthly visitors, 5%+ conversion rate

### Design Constraints

1. Must work within Next.js 15 App Router
2. Must use Shadcn/ui components
3. Must follow Xenboox brand voice (AI-native, confident, human)
4. Must be accessible (WCAG 2.1 AA)
5. Must be responsive (mobile, tablet, desktop)
6. Must load fast (optimized images, lazy loading)

---

## Loop 3: IDEATE

### Option A: Editorial Layout (OpenAI-style)

**Hero:** Blog title + featured post
**Grid:** Card grid with image + title + category + date + read time
**Sidebar:** Popular posts, categories, newsletter signup
**Pros:** Clean, scannable, familiar
**Cons:** May feel generic

### Option B: Magazine Layout (Stripe-style)

**Hero:** Large featured post with image
**Grid:** Masonry layout with varying card sizes
**Sidebar:** None (full-width content)
**Pros:** Visually engaging, premium feel
**Cons:** More complex to implement

### Option C: Minimal Layout (Anthropic-style)

**Hero:** Simple blog title
**Grid:** Text-heavy list with minimal images
**Sidebar:** None
**Pros:** Fast loading, content-first
**Cons:** May feel boring

### Option D: Hybrid (Recommended)

**Hero:** Blog title + featured post
**Grid:** Card grid with image + title + category + date + read time
**Sidebar:** Popular posts, categories, newsletter signup
**Pros:** Best of all worlds
**Cons:** More complex to implement

---

## Loop 4: PROTOTYPE

### Xenboox Blog Page — Production Design

#### Page Structure (Top to Bottom)

**1. Navbar** (standard)

- Logo left, nav center, "Try free" + "Log in" right
- Sticky with backdrop blur

**2. Hero Section**

```
Layout: Full-width, centered content
Content:
  - Eyebrow: "Blog"
  - Headline: "Insights for AI-native accounting" (48-56px)
  - Subtitle: "Expert insights on AI, accounting, and the future of finance."
  - Search bar: "Search articles..."
Background: Gradient (purple to blue) or clean white
Typography: Hero headline 48-56px, subtitle 18-20px
```

**3. Featured Post Section**

```
Layout: Full-width, large card
Content:
  - Image: Hero image for featured post
  - Category tag: "Featured"
  - Title: Featured post title (24-28px)
  - Excerpt: 2-3 sentences
  - Author: Author name + avatar
  - Date: Publication date
  - Read time: "5 min read"
  - CTA: "Read more"
Background: White
Typography: Title 24-28px, excerpt 16px
```

**4. Category Filters**

```
Layout: Horizontal scroll or wrap
Content:
  - Filter buttons: All, Product, Engineering, AI, Accounting, Company
  - Active state: Filled button
  - Inactive state: Outline button
Background: Light gray (#f8f9fa)
Typography: Filter text 14px, medium weight
```

**5. Blog Grid**

```
Layout: 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
Content: Blog post cards
Card Design:
  - Image: 16:9 ratio
  - Category tag: Colored pill
  - Title: 18-20px, medium weight
  - Excerpt: 2-3 sentences, 14-16px
  - Author: Name + avatar
  - Date: Publication date
  - Read time: "X min read"
  - CTA: "Read more" link
Background: White
Typography: Title 18-20px, excerpt 14-16px
```

**6. Sidebar (Desktop Only)**

```
Layout: Right sidebar, 300px width
Content:
  - Popular posts: Top 5 posts by views
  - Categories: List of categories with post counts
  - Newsletter signup: Email input + "Subscribe" button
  - Social links: Twitter, LinkedIn, GitHub
Background: White
Typography: Section titles 16px, body 14px
```

**7. Pagination**

```
Layout: Centered, below grid
Content:
  - Previous / Next buttons
  - Page numbers: 1, 2, 3, ...
  - Current page highlighted
Background: White
Typography: Page numbers 14px
```

**8. Newsletter CTA (Mobile)**

```
Layout: Full-width, below grid (mobile only)
Content:
  - Headline: "Stay updated" (24px)
  - Subtitle: "Get the latest insights on AI-native accounting." (16px)
  - Email input + "Subscribe" button
Background: Gradient (purple to blue)
Typography: Headline 24px, subtitle 16px
```

**9. Footer** (standard)

- Multi-column links, social icons, legal links, copyright

---

#### Blog Post Page Structure

**1. Navbar** (standard)

**2. Hero Section**

```
Layout: Full-width, centered content (max-width: 800px)
Content:
  - Category tag: Colored pill
  - Title: Post title (40-48px)
  - Excerpt: 2-3 sentences (20px)
  - Author: Name + avatar + bio
  - Date: Publication date
  - Read time: "X min read"
  - Social share: Twitter, LinkedIn, Copy link
Background: White
Typography: Title 40-48px, excerpt 20px
```

**3. Featured Image**

```
Layout: Full-width, max-width: 1200px
Content: Hero image for post
Background: White
```

**4. Article Content**

```
Layout: 2-column (content left, sidebar right) on desktop, single column on mobile
Content:
  - Article body: Rich text with headings, paragraphs, images, code blocks
  - Max-width: 700px for readability
  - Typography: 18px body, 1.7 line-height
Background: White
Typography: Body 18px, line-height 1.7
```

**5. Article Sidebar (Desktop Only)**

```
Layout: Right sidebar, 300px width
Content:
  - Table of contents: Headings from article
  - Related posts: 3-5 related articles
  - Newsletter signup: Email input + "Subscribe" button
Background: White
Typography: Section titles 16px, body 14px
```

**6. Author Bio**

```
Layout: Full-width, max-width: 800px
Content:
  - Author photo: 80x80px circular
  - Author name: 20px, medium weight
  - Author bio: 2-3 sentences, 16px
  - Social links: Twitter, LinkedIn
Background: Light gray (#f8f9fa)
Typography: Name 20px, bio 16px
```

**7. Related Posts**

```
Layout: 3-column grid (desktop), 1-column (mobile)
Content: Related post cards (same design as blog grid)
Background: White
Typography: Same as blog grid
```

**8. Newsletter CTA**

```
Layout: Full-width, centered content
Content:
  - Headline: "Enjoyed this article?" (32px)
  - Subtitle: "Subscribe for more insights on AI-native accounting." (18px)
  - Email input + "Subscribe" button
Background: Gradient (purple to blue)
Typography: Headline 32px, subtitle 18px
```

**9. Footer** (standard)

---

### Component Breakdown

| Component         | Shadcn/ui Component | Custom Needed         |
| ----------------- | ------------------- | --------------------- |
| Hero              | -                   | Custom with gradient  |
| Featured Post     | Card                | Large card variant    |
| Category Filters  | Button group        | Filter buttons        |
| Blog Grid         | Card grid           | Blog post card        |
| Sidebar           | -                   | Custom sidebar        |
| Pagination        | Pagination          | Standard pagination   |
| Newsletter CTA    | Input + Button      | Custom gradient bg    |
| Article Content   | -                   | Rich text renderer    |
| Table of Contents | -                   | Custom sidebar widget |
| Author Bio        | -                   | Custom author card    |
| Related Posts     | Card grid           | Blog post card        |

---

### Spacing System

```
--section-padding-y: 96px (6rem)
--section-padding-x: 24px (mobile) / 48px (desktop)
--content-max-width: 800px (article) / 1200px (grid)
--card-gap: 24px
--element-gap: 16px
--sidebar-width: 300px
```

### Typography Scale

```
Hero Headline: 48-56px, bold, line-height 1.1
Post Title: 40-48px, bold, line-height 1.2
Card Title: 18-20px, medium, line-height 1.3
Section Titles: 24-28px, semibold, line-height 1.3
Body Text: 18px, regular, line-height 1.7
Small Text: 14-16px, regular, line-height 1.5
Meta Text: 12-14px, regular, line-height 1.4
```

### Color Tokens

```
--color-bg-primary: #ffffff
--color-bg-secondary: #f8f9fa
--color-bg-dark: #0a0a0a
--color-text-primary: #1a1a1a
--color-text-secondary: #6b7280
--color-text-inverse: #ffffff
--color-accent-primary: #635bff (purple)
--color-accent-secondary: #0a2540 (dark blue)
--color-accent-gradient: linear-gradient(135deg, #635bff, #0a2540)
--color-category-product: #10b981 (green)
--color-category-engineering: #3b82f6 (blue)
--color-category-ai: #8b5cf6 (purple)
--color-category-accounting: #f59e0b (amber)
--color-category-company: #ef4444 (red)
```

### Responsive Breakpoints

```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
Large: > 1280px
```

---

## Loop 5: TEST

### Validation Criteria

**1. Content Discovery:**

- ✅ Category filters for easy filtering
- ✅ Search bar for specific content
- ✅ Pagination for browsing
- ✅ Related posts for discovery

**2. Content Credibility:**

- ✅ Author bios with credentials
- ✅ Read time estimates
- ✅ Publication dates
- ✅ Social proof (popular posts)

**3. Content Engagement:**

- ✅ Featured post highlights best content
- ✅ Card grid for scannability
- ✅ Table of contents for long articles
- ✅ Related posts for continued reading

**4. Content Conversion:**

- ✅ Newsletter signup in sidebar
- ✅ CTA at bottom of articles
- ✅ Social share buttons
- ✅ Author bio with social links

**5. Mobile Experience:**

- ✅ Single column layout
- ✅ Touch targets ≥ 44px
- ✅ No horizontal scroll
- ✅ Newsletter CTA below grid

---

## Loop 6: ITERATE

### Refinements Based on Testing

**Iteration 1:** Add reading progress bar for articles
**Iteration 2:** Add estimated reading time based on scroll speed
**Iteration 3:** Add dark mode for articles
**Iteration 4:** Add comments section (optional)
**Iteration 5:** Add RSS feed for subscribers

### Edge Cases

**No Posts Yet:**

```
Blog
No articles yet. Check back soon for insights on AI-native accounting.
[Subscribe to newsletter]
```

**No Posts in Category:**

```
No [category] articles yet.
[View all articles] or [Subscribe to newsletter]
```

**Loading State:**

- Skeleton cards for blog grid
- Skeleton for featured post
- Skeleton for sidebar

**Error State:**

```
Something went wrong loading articles.
[Retry]
```

---

## Final Design Specification

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar                                                      │
├─────────────────────────────────────────────────────────────┤
│ Hero: "Insights for AI-native accounting"                   │
│ Search bar                                                  │
├─────────────────────────────────────────────────────────────┤
│ Featured Post (large card)                                  │
├─────────────────────────────────────────────────────────────┤
│ [All] [Product] [Engineering] [AI] [Accounting] [Company]   │
├───────────────────────────────────────────┬─────────────────┤
│ Blog Grid (3 columns)                     │ Sidebar         │
│ ┌─────┐ ┌─────┐ ┌─────┐                  │ Popular Posts   │
│ │Card │ │Card │ │Card │                  │ Categories      │
│ └─────┘ └─────┘ └─────┘                  │ Newsletter      │
│ ┌─────┐ ┌─────┐ ┌─────┐                  │ Social Links    │
│ │Card │ │Card │ │Card │                  │                 │
│ └─────┘ └─────┘ └─────┘                  │                 │
├───────────────────────────────────────────┴─────────────────┤
│ Pagination: < 1 2 3 ... >                                  │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────┐
│ Navbar              │
├─────────────────────┤
│ Hero: "Insights..." │
│ Search bar          │
├─────────────────────┤
│ Featured Post       │
├─────────────────────┤
│ [All] [Product] ... │
├─────────────────────┤
│ Blog Grid (1 col)   │
│ ┌─────────────────┐ │
│ │ Card            │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Card            │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Pagination          │
├─────────────────────┤
│ Newsletter CTA      │
├─────────────────────┤
│ Footer              │
└─────────────────────┘
```

---

## Confidence: High

This design combines the best patterns from OpenAI (editorial layout), Stripe (magazine layout), and Anthropic (minimal layout) while maintaining Xenboox's AI-native brand identity.
