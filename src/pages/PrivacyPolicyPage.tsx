import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import PrivacyPolicyKo from '../i18n/legal/PrivacyPolicyKo';
import PrivacyPolicyEn from '../i18n/legal/PrivacyPolicyEn';

const PrivacyPolicyPage: React.FC = () => {
    const { language } = useTranslation();

    useEffect(() => {
        document.title = language === 'en' ? 'Privacy Policy' : '개인정보처리방침';
    }, [language]);

    return (
        <div>
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-white/10 px-12 py-8 md:px-20 md:py-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-8">
                        {language === 'en' ? 'ShareAnything Privacy Policy' : 'ShareAnything 개인정보처리방침'}
                    </h1>
                    {language === 'en' ? <PrivacyPolicyEn /> : <PrivacyPolicyKo />}
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
