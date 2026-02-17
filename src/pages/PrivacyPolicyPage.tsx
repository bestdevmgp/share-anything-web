import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import PrivacyPolicyKo from '../i18n/legal/PrivacyPolicyKo';
import PrivacyPolicyEn from '../i18n/legal/PrivacyPolicyEn';
import PrivacyPolicyJa from '../i18n/legal/PrivacyPolicyJa';
import PrivacyPolicyZhCN from '../i18n/legal/PrivacyPolicyZhCN';
import PrivacyPolicyZhTW from '../i18n/legal/PrivacyPolicyZhTW';

const titleMap: Record<string, string> = {
    ko: '개인정보처리방침',
    en: 'Privacy Policy',
    ja: 'プライバシーポリシー',
    'zh-CN': '隐私政策',
    'zh-TW': '隱私權政策',
};

const headingMap: Record<string, string> = {
    ko: 'ShareAnything 개인정보처리방침',
    en: 'ShareAnything Privacy Policy',
    ja: 'ShareAnything プライバシーポリシー',
    'zh-CN': 'ShareAnything 隐私政策',
    'zh-TW': 'ShareAnything 隱私權政策',
};

const contentMap: Record<string, React.FC> = {
    ko: PrivacyPolicyKo,
    en: PrivacyPolicyEn,
    ja: PrivacyPolicyJa,
    'zh-CN': PrivacyPolicyZhCN,
    'zh-TW': PrivacyPolicyZhTW,
};

const PrivacyPolicyPage: React.FC = () => {
    const { language } = useTranslation();

    useEffect(() => {
        document.title = titleMap[language] || titleMap.en;
    }, [language]);

    const Content = contentMap[language] || contentMap.en;

    return (
        <div>
            <div className="max-w-4xl mx-auto px-4 pt-12 pb-20">
                <div className="bg-card rounded-2xl shadow-sm dark:shadow-none border border-border px-12 py-8 md:px-20 md:py-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
                        {headingMap[language] || headingMap.en}
                    </h1>
                    <Content />
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
