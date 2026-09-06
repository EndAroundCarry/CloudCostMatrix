# ASP.NET Core 9 Web API & PostgreSQL Migration Blueprint

This document details the exact API contracts, PostgreSQL schema, and EF Core entity mappings to migrate from Firebase to a scalable .NET 9 backend if needed in the future.

## 1. Database Schema (PostgreSQL 16)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Estimates table
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128) NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);

-- Normalized Pricing Catalog Cache
CREATE TABLE pricing_catalog_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL,
    region VARCHAR(64) NOT NULL,
    catalog_data JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version VARCHAR(64) NOT NULL
);

CREATE UNIQUE INDEX idx_pricing_provider_region ON pricing_catalog_snapshots(provider, region);
```

## 2. C# Entity Definition (EF Core)

```csharp
namespace CloudCostMatrix.Domain.Entities;

public class Estimate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ConfigJson { get; set; } = string.Empty; // Stored as JSONB in Postgres
    public bool IsPublic { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

## 3. REST API Endpoints (ASP.NET Core Controller)

- `POST /api/v1/estimates/share` -> Creates a shared estimate record (Anonymous or Authenticated).
- `GET /api/v1/estimates/{id}` -> Returns shared estimate configuration.
- `GET /api/v1/users/{userId}/estimates` -> Returns all saved estimates for user dashboard.
- `DELETE /api/v1/users/{userId}/estimates/{id}` -> Deletes user estimate.
- `GET /api/v1/pricing/catalog` -> Returns cached cloud pricing matrices with HTTP ETag support.

## 4. Angular Adapter Swap (1-line change in app.config.ts)

To swap from Firebase to .NET Core, update `src/app/app.config.ts`:

```typescript
// Instead of:
// { provide: ESTIMATE_REPOSITORY_TOKEN, useClass: FirebaseEstimateRepository }

// Simply use:
{ provide: ESTIMATE_REPOSITORY_TOKEN, useClass: DotNetEstimateRepository }
```
