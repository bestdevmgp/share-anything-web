import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { useAuth } from 'context/AuthContext';
import { ClipboardDocumentIcon, CheckIcon, CommandLineIcon } from '@heroicons/react/24/outline';

const CliPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'ShareAnything CLI';
    return () => { document.title = 'ShareAnything'; };
  }, []);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const highlightCode = (code: string) => {
    return code.split('\n').map((line, lineIdx) => {
      const tokens: React.ReactNode[] = [];
      const regex = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|https?:\/\/\S+|\S+)/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(line.slice(lastIndex, match.index));
        }
        const token = match[0];
        let className = 'text-zinc-100';

        if (/^(curl|echo|brew|share|sh|sudo)$/.test(token)) {
          className = 'text-emerald-400';
        } else if (/^-/.test(token)) {
          className = 'text-sky-300';
        } else if (/^https?:\/\//.test(token)) {
          className = 'text-zinc-500';
        }

        tokens.push(<span key={`${lineIdx}-${match.index}`} className={className}>{token}</span>);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < line.length) {
        tokens.push(line.slice(lastIndex));
      }

      return lineIdx > 0 ? [<br key={`br-${lineIdx}`} />, ...tokens] : tokens;
    });
  };

  const CodeBlock = ({ code, index }: { code: string; index: number }) => (
    <div className="relative group">
      <pre className="bg-zinc-900 text-zinc-100 rounded-lg px-4 py-3 text-sm overflow-x-auto font-mono">
        <code>{highlightCode(code)}</code>
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

  const InlineCode = ({ code }: { code: string }) => (
    <code className="text-xs bg-zinc-900 text-zinc-100 px-1.5 py-0.5 rounded font-mono">
      {highlightCode(code)}
    </code>
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
            <CodeBlock code="curl -F 'file=@./myfile.txt' https://share-api.mingyu.dev/cli/upload" index={0} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.curlPathHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlDownload')}</p>
            <CodeBlock code="curl -OJ https://share-api.mingyu.dev/cli/download/123456" index={1} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlMultipleFiles')}</p>
            <CodeBlock code="curl -F 'file=@./file1.txt' -F 'file=@./file2.png' https://share-api.mingyu.dev/cli/upload" index={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlWithApiKey')}</p>
            <CodeBlock code="curl -H 'X-API-Key: sa_your_key_here' -F 'file=@./myfile.txt' -F 'expiration=1h' https://share-api.mingyu.dev/cli/upload" index={3} />
          </div>
        </div>
      </section>

      {/* CLI Tool (share) */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.binaryTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.binaryDescription')}</p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.installCurl')}</p>
            <CodeBlock code="curl -fsSL share-api.mingyu.dev/install | sh" index={4} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.installBrew')}</p>
            <CodeBlock code={"brew tap bestdevmgp/share-anything\nbrew install share-anything"} index={9} />
          </div>

          <hr className="border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryUpload')}</p>
            <CodeBlock code="share upload myfile.txt" index={5} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binaryUploadHint')}</p>
          </div>

          <hr className="border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryDownload')}</p>
            <CodeBlock code="share download 123456" index={6} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryInfo')}</p>
            <CodeBlock code="share info 123456" index={12} />
          </div>

          <hr className="border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryAuth')}</p>
            <CodeBlock code="share login sa_your_key_here" index={8} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryList')}</p>
            <CodeBlock code="share list" index={13} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryLogout')}</p>
            <CodeBlock code="share logout" index={14} />
          </div>
        </div>
      </section>

      {/* Option Reference */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.optionsTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.optionsDescription')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.optionName')}</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">curl</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">share</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.optionValues')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-muted-foreground">{t('cli.limitExpiration')}</td>
                <td className="px-4 py-3"><InlineCode code="-F 'expiration=1h'" /></td>
                <td className="px-4 py-3"><InlineCode code="--expires 1h" /></td>
                <td className="px-4 py-3 text-muted-foreground">5m, 30m, 1h, 3h, 6h, 12h, 24h</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-muted-foreground">{t('cli.limitPassword')}</td>
                <td className="px-4 py-3"><InlineCode code="-F 'password=secret'" /></td>
                <td className="px-4 py-3"><InlineCode code="--password secret" /></td>
                <td className="px-4 py-3 text-muted-foreground">{t('cli.optionAnyString')}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-muted-foreground">{t('cli.limitOneTime')}</td>
                <td className="px-4 py-3"><InlineCode code="-F 'is_one_time=true'" /></td>
                <td className="px-4 py-3"><InlineCode code="--one-time" /></td>
                <td className="px-4 py-3 text-muted-foreground">-</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{t('cli.optionsNote')}</p>
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
                <th className="text-center px-4 py-3 font-medium text-foreground">share</th>
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
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitExpiration')}</td><td className="text-center px-4 py-3">30m</td><td className="text-center px-4 py-3">5m ~ 24h</td></tr>
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
