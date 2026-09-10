import { describe, it, expect } from 'vitest';
import { SchemaGenerator } from './schema-generator';

describe('SchemaGenerator', () => {
  // Permanent regression guard: schema-generator.ts used to ship a fabricated
  // aggregateRating (4.8 from 127 reviews) on an app with no review system —
  // a Google structured-data policy violation. This must never come back.
  it('generateWebApplicationSchema never includes an aggregateRating', () => {
    const schema = SchemaGenerator.generateWebApplicationSchema() as Record<string, unknown>;
    expect(schema['aggregateRating']).toBeUndefined();
    expect(JSON.stringify(schema)).not.toContain('aggregateRating');
  });

  it('every generator emits a valid @type and @context', () => {
    const schemas = [
      SchemaGenerator.generateWebApplicationSchema(),
      SchemaGenerator.generateOrganizationSchema(),
      SchemaGenerator.generateFaqSchema([{ question: 'Q', answer: 'A' }]),
      SchemaGenerator.generateBreadcrumbSchema([{ name: 'Home', url: 'https://cloudcostmatrix.com/' }]),
      SchemaGenerator.generateWebPageSchema({ name: 'Test', description: 'Test page', url: 'https://cloudcostmatrix.com/test' }),
      SchemaGenerator.generateHowToSchema()
    ];
    for (const schema of schemas) {
      expect((schema as Record<string, unknown>)['@context']).toBe('https://schema.org');
      expect((schema as Record<string, unknown>)['@type']).toBeTruthy();
    }
  });

  it('generateOrganizationSchema no longer points logo at the favicon', () => {
    const schema = SchemaGenerator.generateOrganizationSchema();
    expect(schema.logo).not.toContain('favicon.ico');
  });
});
