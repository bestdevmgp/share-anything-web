import React from 'react';

const ApiTermsJa: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. はじめに
            </h2>
            <p className="leading-relaxed">
                本OpenAPI利用規約（以下「本規約」）は、ShareAnythingが提供する公開API（以下「OpenAPI」）の利用に関する条件を定めます。本規約はShareAnything一般利用規約に加えて適用されます。OpenAPIを利用することで、本規約に同意したものとみなします。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 認証とAPIキー
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>すべてのOpenAPIリクエストは、<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">X-API-Key</code>ヘッダーに有効なAPIキーを含める必要があります。</li>
                <li>APIキーは個人の認証情報です。第三者と共有したり、公開リポジトリやクライアントサイドコードに含めたりしないでください。</li>
                <li>外部サービスや用途ごとに個別のAPIキーを発行することを推奨します。</li>
                <li>APIキーが漏洩した可能性がある場合は、直ちに設定から失効させ、新しいキーを発行してください。</li>
                <li>規約違反が確認された場合、ShareAnythingは事前通知なくAPIキーを失効させる場合があります。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. レート制限
            </h2>
            <p className="leading-relaxed mb-4">
                サービスの安定性を確保するため、APIキーごとにレート制限が適用されます。エンドポイントの種類別の制限は以下のとおりです。
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">種別</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">対象エンドポイント</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">制限</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">読み取り</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/me, GET /v1/shares/…, GET /v1/me/uploads, GET /v1/me/downloads 等</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">500回/時間</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">アップロード</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">POST /v1/uploads, マルチパート, presigned, P2P作成 等</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">80回/時間</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">ダウンロード</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/shares/…/download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">150回/時間</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ul className="list-decimal list-inside space-y-2 ml-4 mt-4">
                <li>制限を超えるとHTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code>が返されます。</li>
                <li>429を受け取った場合は、指数バックオフなどのリトライ処理を実装してください。</li>
                <li>繰り返しの制限超過は、APIキー失効やアカウント停止の原因となる場合があります。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 禁止事項
            </h2>
            <p className="leading-relaxed mb-4">OpenAPIを利用して以下の行為を行うことを禁止します。</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>スパム送信、フィッシング、マルウェア配布などの不正行為</li>
                <li>大量の自動スクレイピング</li>
                <li>セキュリティ脆弱性の探索、侵害の試み、または無許可の負荷テスト</li>
                <li>違法コンテンツのアップロード・共有・配布</li>
                <li>他のユーザーのAPIキーの無断使用または共有</li>
                <li>サービスの正常な運営の妨害</li>
                <li>関係法令に違反する行為</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. サービス制限
            </h2>
            <p className="leading-relaxed mb-4">
                OpenAPI経由でアップロードされるファイルのサイズ制限、有効期限、保存ポリシーは、一般{' '}
                <a href="/terms-of-use" className="underline underline-offset-2 can-hover:hover:text-gray-900 dark:can-hover:hover:text-[#EDEDED] transition-colors">利用規約</a>に準じます。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ファイルサイズや件数の制限は一般利用規約に従います。</li>
                <li>有効期限が切れたファイルは自動的に削除されます。</li>
                <li>ShareAnythingは必要に応じてサービス制限を変更する場合があります。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 違反に対する措置
            </h2>
            <p className="leading-relaxed mb-4">
                OpenAPIの悪用または本規約違反が確認された場合、以下の措置が取られることがあります。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>APIキーの即時失効（事前通知なし）</li>
                <li>アカウントの一時停止または永久停止（ウェブ・CLIを含む全サービス対象）</li>
                <li>将来的なAPIキー発行の永久禁止</li>
                <li>違法行為や重大な悪用の場合、法的措置および当局への通報</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 規約の変更
            </h2>
            <p className="leading-relaxed">
                ShareAnythingは本規約をいつでも変更することができます。重要な変更はメールまたはアプリ内通知でお知らせします。変更後もOpenAPIを継続して利用する場合は、変更に同意したものとみなします。
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">施行日</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本規約は2026年5月21日より施行されます。
            </p>
        </div>
    </div>
);

export default ApiTermsJa;
