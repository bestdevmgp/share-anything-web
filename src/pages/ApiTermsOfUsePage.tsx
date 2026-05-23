import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import ApiTermsKo from '../i18n/legal/ApiTermsKo';
import ApiTermsEn from '../i18n/legal/ApiTermsEn';
import ApiTermsJa from '../i18n/legal/ApiTermsJa';
import ApiTermsZhCN from '../i18n/legal/ApiTermsZhCN';
import ApiTermsZhTW from '../i18n/legal/ApiTermsZhTW';

const titleMap: Record<string, string> = {
    ko: 'OpenAPI 이용약관',
    en: 'OpenAPI Terms of Use',
    ja: 'OpenAPI 利用規約',
    'zh-CN': 'OpenAPI 使用条款',
    'zh-TW': 'OpenAPI 使用條款',
};

const headingMap: Record<string, string> = {
    ko: 'ShareAnything OpenAPI 이용약관',
    en: 'ShareAnything OpenAPI Terms of Use',
    ja: 'ShareAnything OpenAPI 利用規約',
    'zh-CN': 'ShareAnything OpenAPI 使用条款',
    'zh-TW': 'ShareAnything OpenAPI 使用條款',
};

const contentMap: Record<string, React.FC> = {
    ko: ApiTermsKo,
    en: ApiTermsEn,
    ja: ApiTermsJa,
    'zh-CN': ApiTermsZhCN,
    'zh-TW': ApiTermsZhTW,
};

const ApiTermsOfUsePage: React.FC = () => {
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

export default ApiTermsOfUsePage;
