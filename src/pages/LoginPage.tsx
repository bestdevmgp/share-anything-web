import React, {useEffect} from 'react';
import {authAPI} from '../services/api';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';

const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    useEffect(() => {
        document.title = t('login.title');
    }, [t]);

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

    return (
        <div className="flex items-center justify-center px-4 py-20">
            <div className="max-w-md w-full">
                <Card className="rounded-3xl border-2 dark:bg-black dark:border-white/30 p-10">
                    <CardContent className="p-0">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold text-foreground mb-3">{t('login.welcome')}</h1>
                            <p className="text-muted-foreground">
                                {t('login.subtitle')}
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full relative flex items-center justify-center px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                            >
                                <svg className="absolute left-4 w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-foreground/80 font-medium text-sm">{t('login.continueWithGoogle')}</span>
                            </button>

                            <button
                                onClick={handleNaverLogin}
                                className="w-full relative flex items-center justify-center px-6 py-3 bg-[#03C75A] hover:bg-[#02b350] rounded-lg transition-colors"
                            >
                                <svg className="absolute left-[19px] w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="white" d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
                                </svg>
                                <span className="text-white font-medium text-sm">{t('login.continueWithNaver')}</span>
                            </button>

                            <button
                                onClick={handleKakaoLogin}
                                className="w-full relative flex items-center justify-center px-6 py-3 bg-[#FEE500] hover:bg-[#f0d900] rounded-lg transition-colors"
                            >
                                <svg className="absolute left-[17px] w-[21px] h-[21px]" viewBox="0 0 24 24">
                                    <path fill="#000000" d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.516 6.457-.197.735-.714 2.666-.818 3.08-.128.508.186.501.391.364.161-.107 2.565-1.74 3.607-2.448.746.104 1.514.16 2.304.16 5.523 0 10-3.463 10-7.613C22 6.463 17.523 3 12 3z" />
                                </svg>
                                <span className="text-[#000000] font-medium text-sm">{t('login.continueWithKakao')}</span>
                            </button>

                            <button
                                onClick={handleAppleLogin}
                                className="w-full relative flex items-center justify-center px-6 py-3 bg-black dark:bg-white rounded-lg hover:bg-[#333333] dark:hover:bg-[#e8e8e8] text-white dark:text-black transition-colors"
                            >
                                <svg className="absolute left-[17px] w-[21px] h-[21px]" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
                                </svg>
                                <span className="font-medium text-sm">{t('login.continueWithApple')}</span>
                            </button>
                        </div>

                        <div className="text-center text-xs text-muted-foreground/70 leading-relaxed">
                            {t('login.termsNotice')}
                            <a href="/privacy-policy" className="text-muted-foreground underline hover:text-foreground">
                                {t('footer.privacyPolicy')}
                            </a>
                            {t('login.termsAnd')}
                            <a href="/terms-of-use" className="text-muted-foreground underline hover:text-foreground">
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

export default LoginPage;
