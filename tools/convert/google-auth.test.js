import { describe, it, expect } from 'vitest';
import { findClientSecret } from './google-auth.js';

describe('findClientSecret', () => {
  it('finds the client secret file and extracts credentials', () => {
    // Uses the real file in the repo root (git-ignored).
    const creds = findClientSecret('.');
    expect(creds.client_id).toBeTruthy();
    expect(creds.client_secret).toBeTruthy();
    expect(creds.redirect_uris?.length || creds.redirect_uri).toBeTruthy();
  });
});
