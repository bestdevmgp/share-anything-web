import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import {authAPI} from '../services/api';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { GoogleLogo, NaverLogo, KakaoLogo, AppleLogo } from '../utils/providerLogos';

type LoginProvider = 'google' | 'naver' | 'kakao' | 'apple' | 'email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [lastProvider, setLastProvider] = useState<LoginProvider | null>(null);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailSending, setEmailSending] = useState(false);

    useEffect(() => {
        document.title = t('login.title');
    }, [t]);

    useEffect(() => {
        const saved = localStorage.getItem('lastLoginProvider') as LoginProvider | null;
        if (saved && ['google', 'naver', 'kakao', 'apple', 'email'].includes(saved)) {
            setLastProvider(saved);
        }
    }, []);

    const handleGoogleLogin = () => {
        window.location.href = authAPI.getGoogleLoginUrl();
    };

    const handleNaverLogin = () => {
        window.location.href = authAPI.getNaverLoginUrl();
    };

    const handleAppleLogin = () => {
        window.location.href = authAPI.getAppleLoginUrl();
    };

    const handleKakaoLogin = () => {
        window.location.href = authAPI.getKakaoLoginUrl();
    };

    const handleEmailSubmit = async () => {
        setEmailError('');
        if (!EMAIL_REGEX.test(email)) {
            setEmailError(t('emailAuth.invalidEmail'));
            return;
        }
        setEmailSending(true);
        try {
            const data = await authAPI.sendEmailAuth(email);
            navigate('/auth/email/verify-wait', { state: { email, sessionId: data.session_id } });
        } catch (err: any) {
            if (err.response?.status === 429) {
                setEmailError(t('emailAuth.rateLimited'));
            } else {
                setEmailError(t('emailAuth.sendFailed'));
            }
        } finally {
            setEmailSending(false);
        }
    };

    const handleEmailKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEmailSubmit();
        }
    };

    return (
        <div className="flex items-center justify-center px-4 py-20">
            <div className="max-w-md w-full">
                <Card className="rounded-3xl border-2 p-10">
                    <CardContent className="p-0">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold text-foreground mb-3">{t('login.welcome')}</h1>
                            <p className="text-muted-foreground">
                                {t('login.subtitle')}
                            </p>
                        </div>

                        {!showEmailInput ? (
                            <>
                                <div className="space-y-4 mb-6">
                                    <button
                                        onClick={handleGoogleLogin}
                                        className="w-full relative flex items-center justify-center px-6 py-3 bg-[#F2F2F2] dark:bg-[#131314] border border-border rounded-lg can-hover:hover:bg-[#E8E8E8] dark:can-hover:hover:bg-[#1f1f1f] active:bg-[#E8E8E8] dark:active:bg-[#1f1f1f] transition-colors"
                                    >
                                        <GoogleLogo className="absolute left-4 w-5 h-5" />
                                        <span className="relative">
                                            <span className="text-[#1F1F1F] dark:text-[#E3E3E3] font-medium text-sm">{t('login.continueWithGoogle')}</span>
                                            {lastProvider === 'google' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleNaverLogin}
                                        className="w-full relative flex items-center justify-center px-6 py-3 bg-[#03C75A] can-hover:hover:bg-[#02b350] active:bg-[#02b350] rounded-lg transition-colors"
                                    >
                                        <NaverLogo className="absolute left-[19px] w-4 h-4" />
                                        <span className="relative">
                                            <span className="text-white font-medium text-sm">{t('login.continueWithNaver')}</span>
                                            {lastProvider === 'naver' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleKakaoLogin}
                                        className="w-full relative flex items-center justify-center px-6 py-3 bg-[#FEE500] can-hover:hover:bg-[#f0d900] active:bg-[#f0d900] rounded-lg transition-colors"
                                    >
                                        <KakaoLogo className="absolute left-[17px] w-[21px] h-[21px]" />
                                        <span className="relative">
                                            <span className="text-[#000000] font-medium text-sm">{t('login.continueWithKakao')}</span>
                                            {lastProvider === 'kakao' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleAppleLogin}
                                        className="w-full relative flex items-center justify-center px-6 py-3 bg-black dark:bg-white rounded-lg can-hover:hover:bg-[#333333] dark:can-hover:hover:bg-[#e8e8e8] active:bg-[#333333] dark:active:bg-[#e8e8e8] text-white dark:text-black transition-colors"
                                    >
                                        <AppleLogo className="absolute left-[17px] w-[21px] h-[21px]" />
                                        <span className="relative">
                                            <span className="font-medium text-sm">{t('login.continueWithApple')}</span>
                                            {lastProvider === 'apple' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-sm text-muted-foreground">{t('login.or')}</span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                {/* Email button */}
                                <div className="mb-8">
                                    <button
                                        onClick={() => setShowEmailInput(true)}
                                        className="w-full relative flex items-center justify-center px-6 py-3 bg-card border border-border rounded-lg can-hover:hover:bg-accent active:bg-accent transition-colors"
                                    >
                                        <EnvelopeIcon className="absolute left-4 w-5 h-5 text-foreground" />
                                        <span className="relative">
                                            <span className="font-medium text-sm text-foreground">{t('login.continueWithEmail')}</span>
                                            {lastProvider === 'email' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="mb-8">
                                <button
                                    onClick={() => { setShowEmailInput(false); setEmailError(''); }}
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground can-hover:hover:text-foreground active:text-foreground transition-colors mb-5"
                                >
                                    <ArrowLeftIcon className="w-4 h-4" />
                                    {t('emailAuth.backToLogin')}
                                </button>

                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('emailAuth.enterEmail')}
                                </label>
                                <Input
                                    type="email"
                                    placeholder={t('emailAuth.emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                    onKeyDown={handleEmailKeyDown}
                                    className="h-12 mb-3"
                                    autoFocus
                                />
                                {emailError && (
                                    <p className="text-sm text-destructive mb-3">{emailError}</p>
                                )}
                                <Button
                                    onClick={handleEmailSubmit}
                                    disabled={emailSending}
                                    className="w-full h-12 rounded-lg text-sm"
                                >
                                    {emailSending ? t('emailAuth.next') + '...' : t('emailAuth.next')}
                                </Button>
                            </div>
                        )}

                        <div className="text-center text-xs text-muted-foreground/70 leading-relaxed">
                            {t('login.termsNotice')}
                            <a href="/privacy-policy" className="text-muted-foreground underline can-hover:hover:text-foreground active:text-foreground">
                                {t('footer.privacyPolicy')}
                            </a>
                            {t('login.termsAnd')}
                            <a href="/terms-of-use" className="text-muted-foreground underline can-hover:hover:text-foreground active:text-foreground">
                                {t('footer.termsOfUse')}
                            </a>
                            {t('login.termsAgree')}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const RecentLoginBubble: React.FC<{ label: string }> = ({ label }) => (
    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-[10px] opacity-0 [animation-delay:500ms] animate-bubble-pop pointer-events-none inline-flex items-center bg-popover border border-border rounded shadow-md px-[6px] py-[6.5px]">
        <span className="absolute top-1/2 -left-[4px] -translate-y-1/2 w-[7px] h-[7px] bg-popover border-l border-b border-border rotate-45" />
        <span className="relative text-xs leading-none font-medium text-popover-foreground whitespace-nowrap">
            {label}
        </span>
    </span>
);

export default LoginPage;
