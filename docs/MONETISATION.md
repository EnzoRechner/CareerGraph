# MONETISATION.md — CareerGraph Revenue Strategy

## Principles

1. **Free tier must be genuinely useful.** If the free experience is crippled, users leave. The free tier is the marketing funnel — it demonstrates value so users want more.
2. **Premium gates insight, not access.** Browsing the graph and seeing career titles is free. Understanding *how to get there* (pathfinding, skills gap analysis, transition reports) is premium. The graph is the hook. The intelligence is the product.
3. **Build first, gate second.** Every feature is built fully functional first. Gating is applied as a thin middleware layer after the feature works. This keeps the codebase clean and testable.
4. **Revenue diversity.** Don't depend on a single stream. Subscriptions + affiliates + API access gives three independent revenue lines.

---

## Tier Definitions

### Free Tier (Guest / Registered)

| Feature | Available |
|---------|-----------|
| Browse 3D career graph | Yes |
| Click to explore neighbourhood (2 hops) | Yes |
| View career title, description, cluster, education level | Yes |
| Search careers by name | Yes |
| Browse career clusters | Yes |
| View top 3 skills and top 3 knowledge areas per career | Yes (capped) |
| Set current role / target role | Yes (localStorage, no account needed) |
| Pathfinding | **No** — shows "Unlock with Premium" prompt |
| Full skills/knowledge/tasks list | **No** — shows top 3 with "See all with Premium" |
| RIASEC interest profile matching | **No** |
| Transition report (step-by-step with requirements) | **No** |
| Salary progression chart along a path | **No** |
| Skills gap analysis (what you need to learn) | **No** |
| Deep neighbourhood (3 hops) | **No** — free is 2 hops max |
| API access | **No** |

### Premium Tier ($8-12/month or $80-100/year)

Everything in Free, plus:

| Feature | Available |
|---------|-----------|
| Pathfinding between any two careers | Yes |
| Full metadata: all skills, knowledge, tasks, tech skills, work styles | Yes |
| RIASEC interest profile → career matching (Career Finder) | Yes |
| Transition reports: step-by-step with certs, years, salary delta | Yes |
| Salary progression visualisation along a path | Yes |
| Skills gap analysis: your current role vs target role | Yes |
| Deep neighbourhood (3 hops) | Yes |
| Save multiple paths and career plans | Yes (requires auth) |
| Export transition report as PDF | Yes |
| Priority data updates | Yes |

### API Tier (B2B, custom pricing)

| Feature | Available |
|---------|-----------|
| REST API access with API key | Yes |
| Rate-limited: 1,000 req/day (starter), 10,000/day (pro) | Yes |
| All endpoints including pathfinding | Yes |
| Bulk queries | Yes |
| Webhook notifications on data updates | Future |

---

## Technical Architecture

### User Model

```sql
-- Add to V1 schema (or as a migration in Phase 5)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(100),
    auth_provider   VARCHAR(20) NOT NULL,     -- 'google', 'github', 'email'
    auth_provider_id VARCHAR(255),            -- Provider's user ID
    tier            VARCHAR(20) NOT NULL DEFAULT 'free',  -- 'free', 'premium', 'api'
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    subscription_status VARCHAR(20) DEFAULT 'none',  -- 'none', 'active', 'past_due', 'cancelled'
    subscription_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash        VARCHAR(64) NOT NULL,     -- SHA-256 of the API key
    key_prefix      VARCHAR(8) NOT NULL,      -- First 8 chars for identification
    name            VARCHAR(100),
    rate_limit_daily INT NOT NULL DEFAULT 1000,
    is_active       BOOLEAN DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_stripe_customer ON users (stripe_customer_id);
CREATE INDEX ix_api_keys_prefix ON api_keys (key_prefix);
```

### Feature Gating Middleware

The gating layer sits between the endpoint and the service. The service always returns full data.
The middleware trims or blocks based on the user's tier.

```csharp
// Middleware sketch — not final implementation

// 1. Attribute to mark endpoints with tier requirements
[AttributeUsage(AttributeTargets.Method)]
public class RequiresTierAttribute : Attribute
{
    public string MinimumTier { get; }
    public RequiresTierAttribute(string minimumTier) => MinimumTier = minimumTier;
}

// 2. Endpoint filter that checks tier
public class TierGateFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var requiredTier = context.HttpContext.GetEndpoint()?
            .Metadata.GetMetadata<RequiresTierAttribute>()?.MinimumTier;

        if (requiredTier == null) return await next(context);

        var user = context.HttpContext.User; // from JWT/cookie auth
        var userTier = user.FindFirst("tier")?.Value ?? "free";

        if (!TierSatisfies(userTier, requiredTier))
        {
            return Results.Json(new
            {
                error = "premium_required",
                message = "This feature requires a Premium subscription.",
                upgradeUrl = "/pricing"
            }, statusCode: 403);
        }

        return await next(context);
    }

    private bool TierSatisfies(string userTier, string required)
    {
        // free < premium < api
        var tierOrder = new Dictionary<string, int>
        {
            ["free"] = 0, ["premium"] = 1, ["api"] = 2
        };
        return tierOrder.GetValueOrDefault(userTier, 0) >= tierOrder.GetValueOrDefault(required, 0);
    }
}

// 3. Usage on endpoints
app.MapGet("/api/v1/careers/path", async (Guid fromId, Guid toId, IPathfindingService svc) =>
{
    var result = await svc.FindShortestPathAsync(fromId, toId);
    return result is not null ? Results.Ok(result) : Results.NotFound();
})
.AddEndpointFilter<TierGateFilter>()
.WithMetadata(new RequiresTierAttribute("premium"));
```

### Metadata Trimming for Free Tier

Free users see abbreviated metadata. The trimming happens in the DTO mapping layer,
not in the database query. This keeps the service layer clean.

```csharp
// CareerNodeDetailDto has a static factory that respects tier
public static CareerNodeDetailDto FromEntity(CareerNode node, string userTier)
{
    var dto = new CareerNodeDetailDto
    {
        Id = node.Id,
        Title = node.Title,
        Description = node.Description,
        // ... all basic fields always included
    };

    if (userTier == "free")
    {
        // Cap metadata arrays to top 3 items
        dto.Skills = dto.Skills?.Take(3).ToList();
        dto.Knowledge = dto.Knowledge?.Take(3).ToList();
        dto.Tasks = dto.Tasks?.Take(3).ToList();
        dto.TechnologySkills = dto.TechnologySkills?.Take(3).ToList();

        // Null out premium-only fields
        dto.Interests = null;     // RIASEC profile is premium
        dto.WorkStyles = null;
        dto.WorkValues = null;

        // Flag that content is truncated
        dto.IsTruncated = true;
        dto.FullContentRequires = "premium";
    }

    return dto;
}
```

### Angular Premium UI Patterns

```typescript
// Pattern: premium feature prompt in the UI
@Component({
    selector: 'app-premium-gate',
    template: `
        @if (userTier() === 'premium') {
            <ng-content />
        } @else {
            <div class="premium-gate">
                <div class="premium-gate__icon">🔒</div>
                <p class="premium-gate__message">{{ message() }}</p>
                <a routerLink="/pricing" class="premium-gate__cta">Unlock with Premium</a>
            </div>
        }
    `
})
export class PremiumGateComponent {
    message = input<string>('This feature requires Premium');
    userTier = inject(UserService).tier;
}

// Usage in career detail sidebar:
// <app-premium-gate message="See full skills analysis">
//     <app-skills-list [skills]="career.skills" />
// </app-premium-gate>
```

### Stripe Integration

Use Stripe Checkout for the simplest integration. No custom payment forms needed.

**Flow:**
1. User clicks "Upgrade to Premium" → frontend calls `POST /api/v1/billing/checkout`
2. Backend creates a Stripe Checkout Session with the Premium price ID
3. Backend returns the Checkout Session URL
4. Frontend redirects to Stripe-hosted checkout page
5. User pays on Stripe's page (PCI compliance handled by Stripe)
6. Stripe sends webhook to `POST /api/v1/billing/webhook`
7. Backend updates user.tier = 'premium', sets subscription IDs and expiry
8. User is redirected back to the app with premium features unlocked

**Endpoints:**

```
POST /api/v1/billing/checkout          → { checkoutUrl: "https://checkout.stripe.com/..." }
POST /api/v1/billing/webhook           → (Stripe webhook receiver)
GET  /api/v1/billing/portal            → { portalUrl: "https://billing.stripe.com/..." }
POST /api/v1/billing/cancel            → { status: "cancelled", expiresAt: "..." }
GET  /api/v1/billing/status            → { tier, status, expiresAt, ... }
```

**Stripe Products (create in Stripe Dashboard):**
- Product: "CareerGraph Premium"
- Price: $9/month (recurring) or $90/year (recurring, ~17% discount)
- Trial: 7-day free trial (optional, good for conversion)

### Affiliate Link Infrastructure

Career detail sidebar shows educational resources per career. Each link includes an affiliate tag.

```typescript
// In career detail sidebar, after the career info:
// "Recommended learning for this career:"
// - [Coursera: Education Specialist Certificate](https://coursera.org/...?ref=careergraph)
// - [Udemy: PMP Certification Prep](https://udemy.com/...?ref=careergraph)

// Links are stored in career_nodes.metadata.affiliateLinks (future enrichment)
// or generated dynamically by searching partner APIs
```

For MVP, this is just a UI slot in the sidebar that says "Learning resources coming soon."
Affiliate partnerships are set up after the product has traffic.

---

## Pricing Page Design

The pricing page is a simple Angular route (`/pricing`) with:
- Free tier card (current features, "You're on this plan")
- Premium tier card (expanded features, price, "Start 7-day trial" CTA)
- API tier card ("Contact us" for B2B custom pricing)
- FAQ: "Can I cancel anytime?", "What payment methods?", "Is there a free trial?"

---

## Phase Integration

Monetisation is **Phase 5** in the build plan. By this point, Phases 1-4 have delivered
a fully functional app. Phase 5 layers on auth + payments + gating without rewriting
existing features.

### Phase 5: Auth + Monetisation

**Tasks:**
1. Add `users` and `api_keys` tables (migration V5)
2. Implement OAuth login (Google + GitHub via ASP.NET Core Identity or JWT)
3. Add `UserService` in Angular (signal-based, stores tier + auth state)
4. Create `TierGateFilter` middleware in .NET
5. Apply tier gating to premium endpoints (pathfinding, deep neighbourhood)
6. Implement metadata trimming in DTOs (free = top 3, premium = full)
7. Create `PremiumGateComponent` in Angular
8. Apply premium gates in sidebar (full skills, RIASEC, tasks)
9. Create Stripe products/prices in Stripe Dashboard
10. Implement `POST /api/v1/billing/checkout` (Stripe Checkout Session)
11. Implement `POST /api/v1/billing/webhook` (subscription lifecycle)
12. Implement `GET /api/v1/billing/portal` (Stripe Customer Portal)
13. Implement `GET /api/v1/billing/status` 
14. Create `/pricing` page in Angular
15. Add "Upgrade" CTA in nav bar for free users
16. Add "Upgrade" prompts at each premium gate point
17. Test full flow: register → browse free → hit gate → checkout → premium unlocked
18. Migrate localStorage preferences to user account on login

**Verification Checklist:**
```
[ ] OAuth login works (Google and/or GitHub)
[ ] Free user sees truncated metadata (top 3 skills/knowledge)
[ ] Free user gets 403 on /careers/path with upgrade prompt
[ ] Free user can still browse graph, search, view basic details
[ ] Premium checkout flow works end-to-end (use Stripe test mode)
[ ] Webhook correctly updates user tier
[ ] Premium user sees full metadata + pathfinding
[ ] Cancellation sets expiry date, access continues until expiry
[ ] Pricing page renders correctly
[ ] Premium gate components show upgrade CTA for free users
```

---

## Environment Variables (Phase 5 additions)

```env
# Stripe (add to .env.example in Phase 5)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# JWT
JWT_SECRET=generate_a_strong_random_string
JWT_ISSUER=careergraph
JWT_AUDIENCE=careergraph
```

---

## Revenue Projections (Rough Estimates)

These are not forecasts — they're sanity checks to see if the business model can sustain costs.

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|------------|
| Monthly visitors | 1,000 | 5,000 | 20,000 |
| Free → Registered conversion | 10% | 15% | 20% |
| Registered → Premium conversion | 3% | 5% | 8% |
| Premium subscribers | 3 | 37 | 320 |
| Monthly revenue (@ $9/mo) | $27 | $333 | $2,880 |
| Infrastructure cost | $6/mo | $6/mo | $20/mo |
| Net | $21/mo | $327/mo | $2,860/mo |

Even conservative numbers cover infrastructure. The break-even point is 1 premium subscriber.

---

## What NOT to Build Yet

- Custom payment forms (use Stripe Checkout — it handles PCI compliance)
- Usage-based pricing (too complex for MVP, switch to it if API tier takes off)
- Team/organisation accounts (B2B feature, build when there's demand)
- Ad infrastructure (never — this is a premium product, not an ad platform)
- Cryptocurrency payments (complexity for zero demand)
- Lifetime deals (destroys recurring revenue, avoid until you understand churn)
