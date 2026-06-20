import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { useAuth } from 'context/AuthContext';
import { CommandLineIcon } from '@heroicons/react/24/outline';
import CopyButton from '../components/CopyButton';

const CliPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = t('cli.pageTitle');
    return () => { document.title = 'ShareAnything'; };
  }, [t]);

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
        let className = 'text-zinc-800 dark:text-zinc-100';

        if (/^(curl|echo|share|sh|sudo|npm)$/.test(token)) {
          className = 'text-emerald-600 dark:text-emerald-400';
        } else if (/^-/.test(token)) {
          className = 'text-sky-600 dark:text-sky-300';
        } else if (/^https?:\/\//.test(token)) {
          className = 'text-zinc-400 dark:text-zinc-500';
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
    <div className="relative">
      <pre className="bg-[#ebebeb] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg px-4 py-3 pr-12 text-sm overflow-x-auto font-mono">
        <code>{highlightCode(code)}</code>
      </pre>
      <div className="absolute top-0 right-0 bottom-0 w-16 pointer-events-none rounded-r-lg bg-gradient-to-r from-transparent to-[#ebebeb] dark:to-zinc-900 to-40%" />
      <CopyButton
        value={code}
        className="absolute top-2 right-2 p-1.5 bg-[#ebebeb] dark:bg-zinc-900 can-hover:hover:bg-zinc-200 dark:can-hover:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-800"
        iconClassName="w-4 h-4"
        iconIdleClass="text-zinc-400"
        iconCopiedClass="text-green-500 dark:text-green-400"
      />
    </div>
  );

  const InlineCode = ({ code }: { code: string }) => (
    <code className="text-xs bg-[#ebebeb] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono">
      {highlightCode(code)}
    </code>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <CommandLineIcon className="w-8 h-8 text-primary" style={{ strokeWidth: 2 }} />
        <h1 className="text-3xl font-bold text-foreground">{t('cli.pageTitle')}</h1>
      </div>

      <p className="text-lg text-muted-foreground mb-10">
        {t('cli.pageDescription')}
      </p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.binaryTitle')}</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.installNpm')}</p>
            <CodeBlock code="npm i -g share-anything-cli" index={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.installCurl')}</p>
            <CodeBlock code="curl -fsSL share-api.mingyu.dev/install | sh" index={4} />
          </div>

          <hr className="border-black/[0.11] dark:border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryTui')}</p>
            <CodeBlock code="share" index={18} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binaryTuiHint')}</p>
          </div>

          <hr className="border-black/[0.11] dark:border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryUpload')}</p>
            <CodeBlock code="share upload myfile.txt" index={5} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binaryUploadHint')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('cli.binaryUploadPathHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binarySecureUpload')}</p>
            <CodeBlock code="share upload --secure myfile.txt" index={17} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binarySecureUploadHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryList')}</p>
            <CodeBlock code="share list" index={13} />
          </div>

          <hr className="border-black/[0.11] dark:border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryDownload')}</p>
            <CodeBlock code="share download 123456" index={6} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binaryDownloadHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryInfo')}</p>
            <CodeBlock code="share info 123456" index={12} />
          </div>

          <hr className="border-black/[0.11] dark:border-border" />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryBrowserAuth')}</p>
            <CodeBlock code="share login" index={15} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.binaryBrowserAuthHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryAuth')}</p>
            <CodeBlock code="share login sat_your_token_here" index={8} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.binaryLogout')}</p>
            <CodeBlock code="share logout" index={14} />
          </div>
        </div>
      </section>

      <hr className="border-black/25 dark:border-zinc-600 mb-12" />

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.curlTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.curlDescription')}</p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlUpload')}</p>
            <CodeBlock code="curl -F 'file=@./myfile.txt' https://share-api.mingyu.dev/cli/uploads" index={0} />
            <p className="text-xs text-muted-foreground mt-1.5">{t('cli.curlPathHint')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlDownload')}</p>
            <CodeBlock code="curl -OJ https://share-api.mingyu.dev/cli/shares/123456/download" index={1} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlMultipleFiles')}</p>
            <CodeBlock code="curl -F 'file=@./file1.txt' -F 'file=@./file2.png' https://share-api.mingyu.dev/cli/uploads" index={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('cli.curlWithPersonalToken')}</p>
            <CodeBlock code="curl -H 'X-Personal-Token: sat_your_token_here' -F 'file=@./myfile.txt' -F 'expiration=1h' https://share-api.mingyu.dev/cli/uploads" index={3} />
          </div>
        </div>
      </section>

      <hr className="border-black/25 dark:border-zinc-600 mb-12" />

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.optionsTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.optionsDescription')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.optionName')}</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">curl</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">share-cli</th>
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
              <tr>
                <td className="px-4 py-3 text-muted-foreground">{t('cli.limitSecure')}</td>
                <td className="px-4 py-3 text-muted-foreground">-</td>
                <td className="px-4 py-3"><InlineCode code="--secure" /></td>
                <td className="px-4 py-3 text-muted-foreground">-</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{t('cli.optionsNote')}</p>
      </section>

      <hr className="border-black/25 dark:border-zinc-600 mb-12" />

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.comparisonTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.feature')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">curl</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">share-cli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureInstall')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">{t('cli.featureRequired')}</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureProgress')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featurePipe')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureLargeFile')}</td><td className="text-center px-4 py-3">10GB / day</td><td className="text-center px-4 py-3">1TB / day</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureMultipart')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featurePersonalToken')}</td><td className="text-center px-4 py-3">✓</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.featureSecure')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-black/25 dark:border-zinc-600 mb-12" />

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.limitsTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">{t('cli.feature')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">{t('cli.guest')}</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">{t('cli.personalTokenUser')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitMaxSize')}</td><td className="text-center px-4 py-3">10GB / day</td><td className="text-center px-4 py-3">1TB / day</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitExpiration')}</td><td className="text-center px-4 py-3">30m</td><td className="text-center px-4 py-3">5m ~ 24h</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitPassword')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitOneTime')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
              <tr><td className="px-4 py-3 text-muted-foreground">{t('cli.limitHistory')}</td><td className="text-center px-4 py-3">-</td><td className="text-center px-4 py-3">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-black/25 dark:border-zinc-600 mb-12" />

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('cli.personalTokenTitle')}</h2>
        <p className="text-muted-foreground mb-4">{t('cli.personalTokenDescription')}</p>
        {isAuthenticated ? (
          <Link
            to="/settings?tab=personal-tokens"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium can-hover:hover:bg-primary/90 transition-colors"
          >
            {t('cli.managePersonalTokens')}
          </Link>
        ) : (
          <Link
            to="/signin"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium can-hover:hover:bg-primary/90 transition-colors"
          >
            {t('cli.loginToGetPersonalToken')}
          </Link>
        )}
      </section>
    </div>
  );
};

export default CliPage;
