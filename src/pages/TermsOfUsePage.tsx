import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import TermsOfUseKo from '../i18n/legal/TermsOfUseKo';
import TermsOfUseEn from '../i18n/legal/TermsOfUseEn';
import TermsOfUseJa from '../i18n/legal/TermsOfUseJa';
import TermsOfUseZhCN from '../i18n/legal/TermsOfUseZhCN';
import TermsOfUseZhTW from '../i18n/legal/TermsOfUseZhTW';

const titleMap: Record<string, string> = {
    ko: '이용약관',
    en: 'Terms of Use',
    ja: '利用規約',
    'zh-CN': '使用条款',
    'zh-TW': '使用條款',
};

const headingMap: Record<string, string> = {
    ko: 'ShareAnything 이용약관',
    en: 'ShareAnything Terms of Use',
    ja: 'ShareAnything 利用規約',
    'zh-CN': 'ShareAnything 使用条款',
    'zh-TW': 'ShareAnything 使用條款',
};

const contentMap: Record<string, React.FC> = {
    ko: TermsOfUseKo,
    en: TermsOfUseEn,
    ja: TermsOfUseJa,
    'zh-CN': TermsOfUseZhCN,
    'zh-TW': TermsOfUseZhTW,
};

const TermsOfServicePage: React.FC = () => {
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

export default TermsOfServicePage;
