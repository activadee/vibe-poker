import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../../../');
const atRoot = (p: string): string => path.join(repoRoot, p);

describe('OSS Repository Readiness', () => {
  it('has required top-level OSS files', () => {
    const requiredFiles = ['LICENSE', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md'];
    const missing = requiredFiles.filter((f) => !existsSync(atRoot(f)));
    expect(missing).toEqual([]);
  });

  it('has GitHub issue and PR templates', () => {
    const files = [
      '.github/ISSUE_TEMPLATE/bug_report.md',
      '.github/ISSUE_TEMPLATE/feature_request.md',
      '.github/pull_request_template.md',
    ];
    const missing = files.filter((f) => !existsSync(atRoot(f)));
    expect(missing).toEqual([]);
  });

  it('README includes badges, architecture, and getting started', () => {
    const readmePath = atRoot('README.md');
    expect(existsSync(readmePath)).toBe(true);
    const readme = readFileSync(readmePath, 'utf8');

    // CI badge
    expect(readme).toMatch(/actions\/workflows\/ci\.yml.*badge\.svg/);
    // License badge or mention of MIT License
    expect(readme).toMatch(/MIT/i);
    expect(readme).toMatch(/license/i);
    // Architecture link or section
    expect(readme).toMatch(/docs\/architecture\.md/);
    // Getting Started section with basic commands
    expect(readme).toMatch(/Getting Started|Quick Start/i);
    expect(readme).toMatch(/npm ci/);
    expect(readme).toMatch(/npx nx/);
  });

  it('documents that a new dev can run the project in ≤ 10 minutes', () => {
    const readme = readFileSync(atRoot('README.md'), 'utf8');
    expect(readme).toMatch(/10\s*minutes|≤\s*10\s*minutes/i);
  });
});
