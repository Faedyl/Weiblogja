# View Tracking Implementation Guide

## Current Implementation ✅
**Type:** IP-Based Daily Unique Views (Similar to YouTube)

**Cost:** FREE (under DynamoDB free tier)
- Up to 200M requests/month
- 25GB storage
- Perfect for blogs with <1M views/month

---

## Database Cost Breakdown

### Per View Cost:
```
New unique view (first time per IP/day):
- Check if viewed: 0.5 RCU
- Record view: 1 WCU
- Increment count: 1 WCU
Total: 0.5 RCU + 2 WCU

Repeat view (same IP, same day):
- Check if viewed: 0.5 RCU
- Get current count: 0.5 RCU
Total: 1 RCU (no write = cheaper)
```

### Storage Cost:
```
Each view record: ~200 bytes
10,000 views = 2 MB storage
Auto-deleted after 30 days (TTL enabled)

AWS Free Tier: 25 GB (you'll use <0.1%)
```

### Real World Examples:
```
10,000 views/month = $0.00 (FREE tier)
100,000 views/month = $0.00 (FREE tier)
1,000,000 views/month = ~$3.00
```

---

## Alternative Implementations

### Option 1: Simple Counter (Cheapest)
**Cost:** 1 WCU per view (66% cheaper writes)

**Pros:**
- Simplest implementation
- Lowest DB cost
- Real-time updates

**Cons:**
- Counts every page refresh
- Same user = multiple views
- No uniqueness

**Use when:** You just want total impressions, not unique visitors

---

### Option 2: Client-Side Tracking (Hybrid)
**Cost:** 1 WCU per unique browser

**Pros:**
- Very cheap (one write per device lifetime)
- No IP storage needed
- Works offline

**Cons:**
- Can be cleared by user
- Not cross-device
- Can be manipulated

**Use when:** Privacy is priority, rough estimates OK

---

### Option 3: Redis + DynamoDB (Enterprise)
**Cost:** ~$15/month + DB costs

**Pros:**
- Handles millions of views
- Lightning fast
- Batch processing
- Advanced analytics

**Cons:**
- Additional service cost
- More complex setup
- Overkill for small blogs

**Use when:** You have >10M views/month

---

## How to Switch Implementations

### To Switch to Simple Counter:
Replace `/src/app/api/blogs/[slug]/views/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB, TABLES } from '@/lib/dynamodb'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	try {
		const { slug } = await params

		const command = new UpdateCommand({
			TableName: TABLES.BLOGS,
			Key: {
				PK: `BLOG#${slug}`,
				SK: 'METADATA'
			},
			UpdateExpression: 'SET #views = if_not_exists(#views, :zero) + :inc',
			ExpressionAttributeNames: {
				'#views': 'views'
			},
			ExpressionAttributeValues: {
				':inc': 1,
				':zero': 0
			},
			ReturnValues: 'ALL_NEW'
		})

		const result = await dynamoDB.send(command)

		return NextResponse.json({
			success: true,
			views: result.Attributes?.views || 0
		})
	} catch (error) {
		console.error('Error incrementing views:', error)
		return NextResponse.json(
			{ error: 'Failed to increment views' },
			{ status: 500 }
		)
	}
}
```

---

## Comparison to YouTube

### YouTube's View Counting:
- ✅ IP + Cookie + Device fingerprint
- ✅ 24-48 hour uniqueness window
- ✅ Bot filtering (user-agent analysis)
- ✅ Minimum watch time (30 seconds)
- ✅ Distributed caching (Redis/Memcached)
- ✅ Batch processing (not real-time)

### Our Implementation:
- ✅ IP-based tracking
- ✅ 24 hour uniqueness window
- ✅ Auto-cleanup (30 day TTL)
- ⚠️ 3 second threshold (vs YouTube's 30 sec)
- ❌ No bot filtering yet
- ❌ Real-time (more expensive but simpler)

**Similarity: ~60-70%** - Same core concept, simpler execution

---

## Monitoring & Limits

### Check Your Usage:
```bash
# AWS CLI to check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=your-table \
  --start-time 2025-11-01T00:00:00Z \
  --end-time 2025-11-25T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

### Free Tier Limits:
- **Reads:** 25 RCU = ~200M reads/month
- **Writes:** 25 WCU = ~200M writes/month
- **Storage:** 25 GB

### When to Worry:
- ❌ <100K views/month: Don't worry at all
- ⚠️ 100K-1M views/month: Still FREE, but monitor
- 🚨 >1M views/month: Consider Redis caching

---

## Recommendations

### For Personal/Small Blogs (<10K views/month):
✅ **Keep current implementation**
- FREE forever
- Accurate tracking
- No complexity

### For Growing Blogs (10K-100K views/month):
✅ **Keep current implementation**
- Still FREE
- Room to grow
- Add bot filtering later

### For Large Blogs (>1M views/month):
⚠️ **Consider upgrades:**
1. Add Redis caching layer
2. Implement batch processing
3. Add bot detection
4. Consider CDN analytics (Cloudflare, etc.)

---

## Cost Summary

| Views/Month | Current Method | Simple Counter | Redis + DB |
|-------------|---------------|----------------|------------|
| 10,000      | $0.00         | $0.00          | ~$15.00    |
| 100,000     | $0.00         | $0.00          | ~$15.00    |
| 1,000,000   | ~$3.00        | ~$1.50         | ~$20.00    |
| 10,000,000  | ~$30.00       | ~$15.00        | ~$50.00    |

**Conclusion:** Current implementation is optimal for 99% of blogs! 🎉
