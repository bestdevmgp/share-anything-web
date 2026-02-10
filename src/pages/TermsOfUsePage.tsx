import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import TermsOfUseKo from '../i18n/legal/TermsOfUseKo';
import TermsOfUseEn from '../i18n/legal/TermsOfUseEn';

const TermsOfServicePage: React.FC = () => {
    const { language } = useTranslation();

    useEffect(() => {
        document.title = language === 'en' ? 'Terms of Use' : '이용약관';
    }, [language]);

    return (
        <div>
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-white/10 px-12 py-8 md:px-20 md:py-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-8">
                        {language === 'en' ? 'ShareAnything Terms of Use' : 'ShareAnything 이용약관'}
                    </h1>
                    {language === 'en' ? <TermsOfUseEn /> : <TermsOfUseKo />}
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
