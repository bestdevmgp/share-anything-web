import React, {useEffect, useState} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {authAPI} from '../services/api';
import { useTranslation } from '../i18n';
import { Input } from '../components/ui/input';
import { GoogleLogo, NaverLogo, KakaoLogo, AppleLogo } from '../utils/providerLogos';
import { Spinner } from '../components/ui/spinner';

type LoginProvider = 'google' | 'naver' | 'kakao' | 'apple' | 'email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const prefillEmail = (location.state as any)?.email || '';
    const [lastProvider, setLastProvider] = useState<LoginProvider | null>(null);
    const [email, setEmail] = useState(prefillEmail);
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
            const deviceId = crypto.randomUUID();
            localStorage.setItem('emailAuthDeviceId', deviceId);
            const data = await authAPI.sendEmailAuth(email, deviceId);
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
        <div className="flex items-center justify-center px-5 sm:px-4 py-20">
            <div className="w-[420px] max-w-full">
                <div>
                        <div className="text-center mb-10">
                            <h1 className="text-2xl font-bold text-foreground">{t('login.welcome')}</h1>
                            <p className="text-2xl font-bold text-foreground">
                                {t('login.subtitle')}
                            </p>
                        </div>

                        <div className="space-y-4 mb-6">
                                    <button
                                        onClick={handleGoogleLogin}
                                        className="w-full relative flex items-center justify-center px-6 h-[50px] bg-[#F2F2F2] dark:bg-[#131314] border border-border rounded-lg can-hover:hover:bg-[#E8E8E8] dark:can-hover:hover:bg-[#1f1f1f] active:bg-[#E8E8E8] dark:active:bg-[#1f1f1f] transition-colors"
                                    >
                                        <GoogleLogo className="absolute left-4 w-5 h-5" />
                                        <span className="relative">
                                            <span className="text-[#1F1F1F] dark:text-[#E3E3E3] font-medium text-sm">{t('login.continueWithGoogle')}</span>
                                            {lastProvider === 'google' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleNaverLogin}
                                        className="w-full relative flex items-center justify-center px-6 h-[50px] bg-[#03C75A] can-hover:hover:bg-[#02b350] active:bg-[#02b350] rounded-lg transition-colors"
                                    >
                                        <NaverLogo className="absolute left-[19px] w-4 h-4" />
                                        <span className="relative">
                                            <span className="text-white font-medium text-sm">{t('login.continueWithNaver')}</span>
                                            {lastProvider === 'naver' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleKakaoLogin}
                                        className="w-full relative flex items-center justify-center px-6 h-[50px] bg-[#FEE500] can-hover:hover:bg-[#f0d900] active:bg-[#f0d900] rounded-lg transition-colors"
                                    >
                                        <KakaoLogo className="absolute left-[17px] w-[21px] h-[21px]" />
                                        <span className="relative">
                                            <span className="text-[#000000] font-medium text-sm">{t('login.continueWithKakao')}</span>
                                            {lastProvider === 'kakao' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleAppleLogin}
                                        className="w-full relative flex items-center justify-center px-6 h-[50px] bg-black dark:bg-white rounded-lg can-hover:hover:bg-[#333333] dark:can-hover:hover:bg-[#e8e8e8] active:bg-[#333333] dark:active:bg-[#e8e8e8] text-white dark:text-black transition-colors"
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

                                {/* Email input */}
                                <div className="mb-8">
                                    <div className="relative">
                                        <Input
                                            type="email"
                                            placeholder={t('login.continueWithEmail')}
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                            onKeyDown={handleEmailKeyDown}
                                            autoFocus={!!prefillEmail}
                                            className="w-full h-[50px] rounded-lg px-4 text-sm"
                                        />
                                        {lastProvider === 'email' && <RecentLoginBubble label={t('login.recentLogin')} />}
                                    </div>
                                    {emailError && (
                                        <p className="text-sm text-destructive mt-1.5">{emailError}</p>
                                    )}
                                    <button
                                        onClick={handleEmailSubmit}
                                        disabled={emailSending || !email.trim()}
                                        className="w-full flex items-center justify-center h-[48px] bg-primary text-primary-foreground font-medium text-sm rounded-lg can-hover:hover:bg-primary/90 active:bg-primary/90 transition-colors disabled:opacity-50 mt-2.5"
                                    >
                                        {emailSending ? <Spinner size="sm" className="text-primary-foreground" /> : t('emailAuth.next')}
                                    </button>
                                </div>

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
                </div>
            </div>
        </div>
    );
};

const RecentLoginBubble: React.FC<{ label: string }> = ({ label }) => (
    <span
        className="absolute left-full top-1/2 -translate-y-1/2 ml-[10px] opacity-0 [animation-delay:500ms] animate-bubble-pop pointer-events-none inline-flex items-center rounded-md px-[7px] py-[6.5px]"
        style={{
            background: 'var(--share-bubble-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'var(--share-bubble-shadow)',
            border: '1px solid var(--share-bubble-border)',
        }}
    >
        <span
            className="absolute top-1/2 -left-[6px] -translate-y-1/2 w-[10px] h-[12px]"
            style={{
                background: 'var(--share-bubble-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
            }}
        />
        <span className="relative text-xs leading-none font-medium text-popover-foreground whitespace-nowrap">
            {label}
        </span>
    </span>
);

export default LoginPage;
