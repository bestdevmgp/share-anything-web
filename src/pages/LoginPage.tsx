import React, {useEffect} from 'react';
import {authAPI} from '../services/api';

const LoginPage: React.FC = () => {
    useEffect(() => {
        document.title = '로그인';
    }, []);

    const handleGoogleLogin = () => {
        window.location.href = authAPI.getGoogleLoginUrl();
    };

    const handleNaverLogin = () => {
        window.location.href = authAPI.getNaverLoginUrl();
    };

    return (
        <div className="flex items-center justify-center px-4 py-20">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-[#0B0A0B] rounded-3xl border-2 border-gray-200 dark:border-white/10 p-10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">환영합니다!</h1>
                        <p className="text-gray-600 dark:text-[#888888]">
                            계정을 선택해 주세요. 모든 정보는 안전하게 보관됩니다.
                        </p>
                    </div>

                    {/* Login Buttons */}
                    <div className="space-y-4 mb-8">
                        {/* Google Login */}
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-white/15 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span className="text-gray-700 dark:text-[#EDEDED] font-medium text-sm">Google로 계속하기</span>
                        </button>

                        {/* Naver Login */}
                        <button
                            onClick={handleNaverLogin}
                            className="w-full flex items-center justify-center space-x-5 px-6 py-3 bg-[#03C75A] hover:bg-[#02b350] rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="white"
                                    d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"
                                />
                            </svg>
                            <span className="text-white font-medium text-sm">네이버로 계속하기</span>
                        </button>
                    </div>

                    {/* Terms and Privacy Notice */}
                    <div className="text-center text-xs text-gray-500 dark:text-[#666666] leading-relaxed">
                        본 서비스 이용 시 ShareAnything의{' '}
                        <a href="/privacy-policy" className="text-gray-500 dark:text-[#888888] underline hover:text-gray-700 dark:hover:text-[#EDEDED]">
                            개인정보처리방침
                        </a>
                        {' '}및{' '}
                        <a href="/terms-of-use" className="text-gray-500 dark:text-[#888888] underline hover:text-gray-700 dark:hover:text-[#EDEDED]">
                            이용약관
                        </a>
                        에 동의하는 것으로 간주됩니다.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
