import React from 'react';
import { ChevronDownIcon, SparklesIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from '../context/ToastContext';
import { copyToClipboard } from '../utils/format';

interface Props {
  /** The localized page content rendered as Markdown — copied to the clipboard. */
  markdown: string;
  /** Raw-markdown URL the AI prompt points at. */
  url: string;
  /** Localized one-liner that precedes the URL in the AI prompt. */
  promptIntro: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Official Markdown mark.
const MarkdownIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-foreground/70" fill="currentColor" aria-hidden="true">
    <path d="M22.27 19.385H1.73A1.73 1.73 0 0 1 0 17.655V6.345a1.73 1.73 0 0 1 1.73-1.73h20.54A1.73 1.73 0 0 1 24 6.345v11.31a1.73 1.73 0 0 1-1.73 1.73zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885-2.308-2.885H3.46v7.845zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z" />
  </svg>
);

// Official Claude mark (simple-icons), coral #D97757.
const ClaudeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#D97757" aria-hidden="true">
    <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
  </svg>
);

// OpenAI / ChatGPT mark.
const ChatGptIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-foreground/80" fill="currentColor" aria-hidden="true">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zm-9.022 12.6a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.778-2.758a.795.795 0 0 0 .393-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.495 4.494zm-9.66-4.125a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.758a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.499 4.499 0 0 1-6.14-1.647zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.142-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.062l4.83-2.787a4.499 4.499 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.499 4.499 0 0 1 7.376-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.098-2.365 2.602-1.5 2.607 1.5v3l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Thin square tile that frames each menu icon.
const IconBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="flex items-center justify-center w-5 h-5 shrink-0 rounded-[5px] border border-border">
    {children}
  </span>
);

const UseWithAI: React.FC<Props> = ({ markdown, url, promptIntro, t }) => {
  // Short prompt: a localized intro + the raw-markdown URL the assistant should read.
  const aiPrompt = `${promptIntro} ${url}`;

  const openInAI = (base: string) => {
    window.open(base + encodeURIComponent(aiPrompt), '_blank', 'noopener,noreferrer');
  };

  const copyMarkdown = async () => {
    if (await copyToClipboard(markdown)) {
      toast.success(t('cli.markdownCopied'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors focus:outline-none">
        <SparklesIcon className="w-4 h-4 text-primary" />
        <span>{t('cli.useWithAI')}</span>
        <ChevronDownIcon className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem className="cursor-pointer items-center gap-2.5 px-3 py-2" onClick={copyMarkdown}>
          <IconBox><MarkdownIcon /></IconBox>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{t('cli.copyMarkdown')}</div>
            <div className="text-xs text-muted-foreground truncate">{t('cli.copyMarkdownDesc')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-2" />
        <DropdownMenuItem className="cursor-pointer items-center gap-2.5 px-3 py-2" onClick={() => openInAI('https://claude.ai/new?q=')}>
          <IconBox><ClaudeIcon /></IconBox>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              {t('cli.openInClaude')}
              <ArrowUpRightIcon className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={2.5} />
            </div>
            <div className="text-xs text-muted-foreground truncate">{t('cli.openInClaudeDesc')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer items-center gap-2.5 px-3 py-2" onClick={() => openInAI('https://chatgpt.com/?q=')}>
          <IconBox><ChatGptIcon /></IconBox>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              {t('cli.openInChatGPT')}
              <ArrowUpRightIcon className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={2.5} />
            </div>
            <div className="text-xs text-muted-foreground truncate">{t('cli.openInChatGPTDesc')}</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UseWithAI;
