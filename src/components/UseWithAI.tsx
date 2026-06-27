import React, { useState } from 'react';
import { ChevronDownIcon, SparklesIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from '../context/ToastContext';
import { copyToClipboard } from '../utils/format';
import { cn } from '../lib/utils';

interface Props {
  /** The page content rendered as Markdown — copied to the clipboard and fed to the AI prompt. */
  markdown: string;
  /** Canonical URL of the page, appended to the AI prompt for reference. */
  url: string;
  /** Localized one-liner that precedes the markdown in the AI prompt. */
  promptIntro: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const MarkdownIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground/80" fill="currentColor" aria-hidden="true">
    <path d="M22.27 19.385H1.73A1.73 1.73 0 0 1 0 17.655V6.345a1.73 1.73 0 0 1 1.73-1.73h20.54A1.73 1.73 0 0 1 24 6.345v11.31a1.73 1.73 0 0 1-1.73 1.73zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885-2.308-2.885H3.46v7.845zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z" />
  </svg>
);

// Coral 4-point sparkle, evoking the Claude mark.
const ClaudeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#D97757" aria-hidden="true">
    <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
  </svg>
);

const ChatGptIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground/80" fill="currentColor" aria-hidden="true">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zm-9.022 12.6a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.778-2.758a.795.795 0 0 0 .393-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.495 4.494zm-9.66-4.125a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.758a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.499 4.499 0 0 1-6.14-1.647zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.142-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.062l4.83-2.787a4.499 4.499 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.499 4.499 0 0 1 7.376-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.098-2.365 2.602-1.5 2.607 1.5v3l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const UseWithAI: React.FC<Props> = ({ markdown, url, promptIntro, t }) => {
  const [open, setOpen] = useState(false);

  // Keep the prompt short: point the assistant at the raw-markdown URL instead of pasting the
  // whole reference, so the user still has room to add their own question.
  const aiPrompt = `${promptIntro} ${url}`;

  const openInAI = (base: string) => {
    window.open(base + encodeURIComponent(aiPrompt), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const copyMarkdown = async () => {
    if (await copyToClipboard(markdown)) {
      toast.success(t('cli.markdownCopied'));
    }
    setOpen(false);
  };

  const Row = ({
    icon,
    title,
    desc,
    external,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    external?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left can-hover:hover:bg-accent active:bg-accent transition-colors"
    >
      <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
          {title}
          {external && <ArrowUpRightIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />}
        </div>
        <div className="text-sm text-muted-foreground truncate">{desc}</div>
      </div>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex items-center gap-2 h-10 pl-3 pr-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground',
            'can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors'
          )}
        >
          <SparklesIcon className="w-4 h-4 text-primary" />
          <span>{t('cli.useWithAI')}</span>
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 p-1.5 rounded-2xl">
        <Row icon={<MarkdownIcon />} title={t('cli.copyMarkdown')} desc={t('cli.copyMarkdownDesc')} onClick={copyMarkdown} />
        <div className="my-1.5 border-t border-border" />
        <Row icon={<ClaudeIcon />} title={t('cli.openInClaude')} desc={t('cli.openInClaudeDesc')} external onClick={() => openInAI('https://claude.ai/new?q=')} />
        <Row icon={<ChatGptIcon />} title={t('cli.openInChatGPT')} desc={t('cli.openInChatGPTDesc')} external onClick={() => openInAI('https://chatgpt.com/?q=')} />
      </PopoverContent>
    </Popover>
  );
};

export default UseWithAI;
