import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { useAuth } from 'context/AuthContext';
import { ClipboardDocumentIcon, CheckIcon, CommandLineIcon } from '@heroicons/react/24/outline';

const CliPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const CodeBlock = ({ code, index }: { code: string; index: number }) => (
    <div className="relative group">
      <pre className="bg-zinc-900 text-zinc-100 rounded-lg px-4 py-3 text-sm overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/50 can-hover:hover:bg-zinc-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copiedIndex === index ? (
          <CheckIcon className="w-4 h-4 text-green-400" />
        ) : (
          <ClipboardDocumentIcon className="w-4 h-4 text-zinc-400" />
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <CommandLineIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">{t('cli.pageTitle')}</h1>
      </div>

      <p className="text-lg text-muted-foreground mb-10">
        {t('cli.pageDescription')}
      </p>

      {/* Quick Start with curl */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.curlTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.curlDescription')}</p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlUpload')}</p>
            <CodeBlock code="curl -F 'file=@myfile.txt' https://share-api.mingyu.dev/cli/upload" index={0} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlDownload')}</p>
            <CodeBlock code="curl -OJ https://share-api.mingyu.dev/cli/download/ABC123" index={1} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlMultipleFiles')}</p>
            <CodeBlock code="curl -F 'file=@file1.txt' -F 'file=@file2.png' https://share-api.mingyu.dev/cli/upload" index={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlWithApiKey')}</p>
            <CodeBlock code="curl -H 'X-API-Key: sa_your_key_here' -F 'file=@myfile.txt' -F 'expiration=1h' https://share-api.mingyu.dev/cli/upload" index={3} />
          </div>
        </div>
      </section>

      {/* SA Binary */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.binaryTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.binaryDescription')}</p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.installTitle')}</p>
            <CodeBlock code="curl -fsSL https://raw.githubusercontent.com/bestdevmgp/share-anything-cli/main/install.sh | sh" index={4} />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryUpload')}</p>
            <CodeBlock code="sany upload myfile.txt" index={5} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryDownload')}</p>
            <CodeBlock code="sany download ABC123" index={6} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryPipe')}</p>
            <CodeBlock code="echo 'hello world' | sany upload --name hello.txt" index={7} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryAuth')}</p>
            <CodeBlock code={`sany login sa_your_key_here\nsany upload myfile.txt --expires 1h --password secret`} index={8} />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.comparisonTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.feature')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">curl</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">sany</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureInstall')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">{t('cli.featureRequired')}</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureProgress')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featurePipe')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureLargeFile')}</td><td className="text-center px-4 py-3">100MB</td><td className="text-center px-4 py-3">3GB</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureMultipart')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureApiKey')}</td><td className="text-center px-4 py-3">✓</td><td className="text-center px-4 py-3">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Guest vs API Key */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.limitsTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.feature')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">{t('cli.guest')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">{t('cli.apiKeyUser')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitMaxSize')}</td><td className="text-center px-4 py-3">100MB</td><td className="text-center px-4 py-3">3GB</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitExpiration')}</td><td className="text-center px-4 py-3">30m</td><td className="text-center px-4 py-3">30m ~ 24h</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitPassword')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitOneTime')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitHistory')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* API Key */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.apiKeyTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.apiKeyDescription')}</p>
        {isAuthenticated ? (
          <Link
            to="/settings?tab=api-keys"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium can-hover:hover:bg-primary/90 transition-colors"
          >
            {t('cli.manageApiKeys')}
          </Link>
        ) : (
          <Link
            to="/signin"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium can-hover:hover:bg-primary/90 transition-colors"
          >
            {t('cli.loginToGetApiKey')}
          </Link>
        )}
      </section>
    </div>
  );
};

export default CliPage;
