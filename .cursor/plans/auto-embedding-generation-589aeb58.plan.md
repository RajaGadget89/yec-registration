<!-- 589aeb58-e5f1-4abe-94a4-b196cebdbf66 f52f1ee6-eadc-46e7-9600-6c3724d972ec -->
# Automatic Embedding Generation for CMS Content Types

## Overview

Integrate automatic embedding generation into CMS content CRUD operations. Embeddings will be generated synchronously during create/update operations but won't block the operation if generation fails. This ensures the cms_embeddings table stays synchronized with content changes.

## Implementation Strategy

### Phase 1: Create Shared Embedding Helper Service

**File: `app/lib/cms-embedding-helper.ts`** (NEW)

Create a centralized service that:

- Generates embeddings for each content type with appropriate text extraction
- Handles chunking for large content (using existing `chunkTextForEmbedding`)
- Stores embeddings in `cms_embeddings` table
- Provides error handling that logs but doesn't throw
- Removes embeddings on delete operations

Key functions:

```typescript
async function generateAndStoreEmbeddings(
  supabase: any,
  contentType: 'news' | 'activities' | 'pages' | 'faq',
  itemId: string,
  content: ContentData,
  language: string
): Promise<void>

async function removeEmbeddings(
  supabase: any,
  itemId: string
): Promise<void>
```

Content extraction rules:

- **News**: `headline + " " + content`
- **Pages**: `title + " " + meta_description + " " + (all sections content joined)`
- **Activities**: `title + " " + (summary/description) + " " + content`
- **FAQ**: `question + " " + answer` (per FAQ item, not group)

### Phase 2: Integrate into Pages API

**Files to modify:**

- `app/api/admin/cms/pages/route.ts` - POST handler
- `app/api/admin/cms/pages/[id]/route.ts` - PUT and DELETE handlers
- `app/api/admin/cms/pages/[id]/sections/route.ts` - POST/PUT handlers (sections changes require re-embedding)

**Integration points:**

POST (Create Page):

```typescript
// After successful page creation (line ~169)
try {
  await generateAndStoreEmbeddings(supabase, 'pages', newPage.id, {
    title: newPage.title,
    meta_description: newPage.meta_description,
    sections: [] // New pages have no sections yet
  }, newPage.language);
} catch (error) {
  console.error('Failed to generate embeddings for new page:', error);
  // Don't fail the operation
}
```

PUT (Update Page):

```typescript
// After successful page update (line ~113)
// Fetch page with sections to get complete content
const { data: pageWithSections } = await supabase
  .from('cms_pages')
  .select('*, cms_page_sections(*)')
  .eq('id', id)
  .single();

try {
  await generateAndStoreEmbeddings(supabase, 'pages', id, pageWithSections, pageWithSections.language);
} catch (error) {
  console.error('Failed to update embeddings for page:', error);
}
```

DELETE (Delete Page):

```typescript
// Before deleting page (line ~164)
try {
  await removeEmbeddings(supabase, id);
} catch (error) {
  console.error('Failed to remove embeddings for page:', error);
}
```

### Phase 3: Integrate into News API

**Files to modify:**

- `app/api/admin/cms/news/route.ts` - POST handler (line ~164)
- `app/api/admin/cms/news/[id]/route.ts` - PUT handler (line ~176) and DELETE handler

**Integration points:**

POST (Create News):

```typescript
// After successful news creation (line ~164)
try {
  await generateAndStoreEmbeddings(supabase, 'news', newNews.id, {
    headline: newNews.headline,
    content: newNews.content
  }, newNews.language);
} catch (error) {
  console.error('Failed to generate embeddings for news:', error);
}
```

PUT (Update News):

```typescript
// After successful news update (line ~176)
try {
  await generateAndStoreEmbeddings(supabase, 'news', id, {
    headline: updatedNews.headline,
    content: updatedNews.content
  }, updatedNews.language);
} catch (error) {
  console.error('Failed to update embeddings for news:', error);
}
```

DELETE (Delete News):

```typescript
// Add DELETE handler to news/[id]/route.ts (currently missing)
export async function DELETE(request, { params }) {
  // ... authentication and validation
  const { id } = await params;
  
  try {
    await removeEmbeddings(supabase, id);
  } catch (error) {
    console.error('Failed to remove embeddings:', error);
  }
  
  await supabase.from('cms_news').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
```

### Phase 4: Integrate into Activities API

**Files to modify:**

- `app/api/admin/cms/activity-cards/route.ts` - POST handler (line ~247)
- `app/api/admin/cms/activity-cards/[id]/route.ts` - PUT handler and DELETE handler

**Integration points:**

POST (Create Activity):

```typescript
// After successful activity creation (line ~247)
try {
  await generateAndStoreEmbeddings(supabase, 'activities', newCard.id, {
    title: newCard.title,
    summary: newCard.description, // Note: DB uses 'description'
    content: newCard.content
  }, newCard.language);
} catch (error) {
  console.error('Failed to generate embeddings for activity:', error);
}
```

PUT (Update Activity):

```typescript
// After successful activity update in activity-cards/[id]/route.ts
try {
  await generateAndStoreEmbeddings(supabase, 'activities', id, {
    title: updatedCard.title,
    summary: updatedCard.description,
    content: updatedCard.content
  }, updatedCard.language);
} catch (error) {
  console.error('Failed to update embeddings for activity:', error);
}
```

DELETE (Delete Activity):

```typescript
// Add DELETE handler to activity-cards/[id]/route.ts (if missing)
// Before deleting activity
try {
  await removeEmbeddings(supabase, id);
} catch (error) {
  console.error('Failed to remove embeddings:', error);
}
```

### Phase 5: Integrate into FAQ API

**Files to modify:**

- `app/api/admin/cms/faq-groups/[id]/items/route.ts` - POST handler (line ~139)
- `app/api/admin/cms/faq-groups/[id]/items/[itemId]/route.ts` - PATCH handler (line ~110) and DELETE handler
- `app/api/admin/cms/faq-groups/[id]/route.ts` - DELETE handler (for group deletion)

**Special handling for FAQ:**

- FAQ items (not groups) get embeddings
- Each FAQ item gets its own embedding entry
- Group deletion should cascade to remove all item embeddings

**Integration points:**

POST (Create FAQ Item):

```typescript
// After successful FAQ item creation (line ~139)
try {
  await generateAndStoreEmbeddings(supabase, 'faq', newItem.id, {
    question: newItem.question,
    answer: newItem.answer
  }, newItem.language || 'th'); // FAQ items inherit group language
} catch (error) {
  console.error('Failed to generate embeddings for FAQ item:', error);
}
```

PATCH (Update FAQ Item):

```typescript
// After successful FAQ item update (line ~110)
try {
  await generateAndStoreEmbeddings(supabase, 'faq', itemId, {
    question: updatedItem.question,
    answer: updatedItem.answer
  }, updatedItem.language || 'th');
} catch (error) {
  console.error('Failed to update embeddings for FAQ item:', error);
}
```

DELETE (Delete FAQ Item):

```typescript
// In faq-groups/[id]/items/[itemId]/route.ts DELETE handler
// Before deleting FAQ item
try {
  await removeEmbeddings(supabase, itemId);
} catch (error) {
  console.error('Failed to remove embeddings:', error);
}
```

DELETE (Delete FAQ Group):

```typescript
// In faq-groups/[id]/route.ts DELETE handler
// Before deleting group, remove embeddings for all items
const { data: items } = await supabase
  .from('cms_faq_items')
  .select('id')
  .eq('group_id', id);

for (const item of items || []) {
  try {
    await removeEmbeddings(supabase, item.id);
  } catch (error) {
    console.error('Failed to remove embeddings for FAQ item:', error);
  }
}
```

## Implementation Details

### Shared Helper Service Structure

```typescript
// app/lib/cms-embedding-helper.ts

import { generateDocumentEmbedding, chunkTextForEmbedding } from './mcp/embeddings';

interface NewsContent {
  headline: string;
  content: string;
}

interface PageContent {
  title: string;
  meta_description?: string;
  sections?: Array<{ content: string }>;
}

interface ActivityContent {
  title: string;
  summary?: string;
  content?: string;
}

interface FAQContent {
  question: string;
  answer: string;
}

type ContentData = NewsContent | PageContent | ActivityContent | FAQContent;

export async function generateAndStoreEmbeddings(
  supabase: any,
  contentType: 'news' | 'activities' | 'pages' | 'faq',
  itemId: string,
  content: ContentData,
  language: string
): Promise<void> {
  // Extract text based on content type
  const textToEmbed = extractTextForEmbedding(contentType, content);
  
  // Chunk if needed (>350 chars)
  const chunks = chunkTextForEmbedding(textToEmbed, 350);
  
  // Remove existing embeddings first
  await supabase.from('cms_embeddings').delete().eq('item_id', itemId);
  
  // Generate and store embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await generateDocumentEmbedding(chunk);
    
    await supabase.from('cms_embeddings').insert({
      item_id: itemId,
      content: chunk,
      embedding: JSON.stringify(embedding),
      type: contentType,
      language: language,
      is_active: true
    });
  }
}

function extractTextForEmbedding(contentType: string, content: ContentData): string {
  switch (contentType) {
    case 'news':
      const news = content as NewsContent;
      return `${news.headline} ${news.content}`;
    
    case 'pages':
      const page = content as PageContent;
      const sectionsText = page.sections?.map(s => s.content).join(' ') || '';
      return `${page.title} ${page.meta_description || ''} ${sectionsText}`.trim();
    
    case 'activities':
      const activity = content as ActivityContent;
      return `${activity.title} ${activity.summary || ''} ${activity.content || ''}`.trim();
    
    case 'faq':
      const faq = content as FAQContent;
      return `${faq.question} ${faq.answer}`;
    
    default:
      return '';
  }
}

export async function removeEmbeddings(supabase: any, itemId: string): Promise<void> {
  await supabase.from('cms_embeddings').delete().eq('item_id', itemId);
}
```

## Testing Checklist

After implementation, verify:

1. Create new page → embeddings generated
2. Update page content → embeddings regenerated
3. Add/update page section → page embeddings regenerated
4. Delete page → embeddings removed
5. Create news article → embeddings generated
6. Update news article → embeddings regenerated
7. Delete news article → embeddings removed
8. Create activity → embeddings generated
9. Update activity → embeddings regenerated
10. Delete activity → embeddings removed
11. Create FAQ item → embeddings generated
12. Update FAQ item → embeddings regenerated
13. Delete FAQ item → embeddings removed
14. Delete FAQ group → all item embeddings removed
15. Embedding generation failure → content operation still succeeds
16. Search API returns updated content → verify embeddings are searchable

## Error Handling

All embedding operations wrapped in try-catch blocks that:

- Log errors with context (content type, item ID, operation)
- Do NOT throw errors that would rollback content operations
- Allow the main CRUD operation to complete successfully
- Provide clear console output for debugging

## Performance Considerations

- Embedding generation is synchronous but non-blocking (doesn't fail operation)
- Average embedding time: 1-3 seconds per content item
- Large content is chunked to maintain quality
- Multiple embeddings per item are supported
- Consider adding a background retry mechanism for failed embeddings (future enhancement)

### To-dos

- [ ] Create shared embedding helper service (app/lib/cms-embedding-helper.ts)
- [ ] Integrate embedding generation into Pages API (POST, PUT, DELETE, sections)
- [ ] Integrate embedding generation into News API (POST, PUT, add DELETE)
- [ ] Integrate embedding generation into Activities API (POST, PUT, DELETE)
- [ ] Integrate embedding generation into FAQ API (POST, PATCH, DELETE for items and groups)
- [ ] Test all CRUD operations for each content type to verify embeddings are maintained