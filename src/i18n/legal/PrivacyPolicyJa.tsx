import React from 'react';

const PrivacyPolicyJa: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. 個人情報の処理目的
            </h2>
            <p className="leading-relaxed mb-4">
                ShareAnything（以下「当社」）は、以下の目的のために個人情報を処理します。処理する個人情報は、以下の目的以外の用途には使用されず、利用目的が変更される場合には、個人情報保護法第18条に基づき別途同意を得る等、必要な措置を講じます。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>会員登録及び管理：会員制サービスの提供、本人確認、会員資格の維持・管理、サービスの不正利用防止</li>
                <li>サービス提供：ファイルのアップロード及びダウンロードサービスの提供、共有コードの生成及び管理</li>
                <li>サービス改善：サービス利用統計の分析及びサービスの改善</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 処理する個人情報の項目
            </h2>
            <div className="leading-relaxed">
                <p className="mb-4">当社はOAuth認証を通じて最小限の個人情報のみを収集します。</p>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">必須収集項目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>Google OAuthログイン時：メールアドレス、名前、プロフィール写真</li>
                    <li>Naver OAuthログイン時：メールアドレス、名前</li>
                    <li>Kakao OAuthログイン時：メールアドレス、ニックネーム、プロフィール写真</li>
                    <li>Apple OAuthログイン時：メールアドレス、名前</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">自動収集項目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>サービス利用記録、IPアドレス</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">ファイル関連情報</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>アップロードしたファイル名、ファイルサイズ、アップロード日時</li>
                    <li>共有コード、ファイルの有効期限</li>
                    <li>ファイルパスワード（暗号化保存）</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">P2Pセキュア転送関連</h3>
                <p className="ml-4">P2Pセキュア転送を利用する場合、ファイルはサーバーに保存されず、送信者と受信者の間で直接転送されます。当社はP2P転送ファイルの内容にアクセスせず、転送履歴（転送日時、ファイルサイズなど）のみを記録します。</p>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. 個人情報の処理及び保有期間
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、法令に基づく個人情報の保有・利用期間、又は情報主体から個人情報を収集する際に同意を得た個人情報の保有・利用期間内で個人情報を処理・保有します。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>会員情報：退会時まで保有。ただし、関係法令違反に伴う捜査・調査等が進行中の場合は、当該捜査・調査の終了時まで保有</li>
                <li>アップロードされたファイル：利用者が指定した有効期限まで保有し、有効期限満了時に直ちに破棄</li>
                <li>サービス利用記録：3か月保管後に破棄</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">関係法令に基づく保有</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>契約又は申込み撤回等に関する記録：5年（電子商取引法）</li>
                <li>消費者の苦情又は紛争処理に関する記録：3年（電子商取引法）</li>
                <li>アクセスに関する記録：3か月（通信秘密保護法）</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 個人情報の第三者提供
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、情報主体の個人情報を第1条（個人情報の処理目的）に明示した範囲内でのみ処理し、情報主体の同意、法律の特別な規定等、個人情報保護法第17条に該当する場合にのみ個人情報を第三者に提供します。
            </p>
            <p className="leading-relaxed">
                現在、当社は個人情報を第三者に提供しておりません。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. 個人情報処理の委託
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、円滑な個人情報処理業務のために、以下のとおり個人情報処理業務を委託しております。
            </p>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse">
                    <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">委託先</th>
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">委託業務の内容</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Google LLC</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認証サービス</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Naver Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認証サービス</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Kakao Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認証サービス</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Apple Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認証サービス</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Amazon Web Services, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">サーバーホスティング</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Cloudflare, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">ファイル保存、TURNリレーサービス（P2Pセキュア転送）</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <p className="leading-relaxed mt-4">
                当社は、委託契約の締結時に個人情報保護法第26条に基づき、委託業務遂行目的以外の個人情報処理の禁止、技術的・管理的保護措置、再委託の制限、受託者に対する管理・監督、損害賠償等の責任に関する事項を契約書等の文書に明記し、受託者が個人情報を安全に処理しているかを監督しております。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 情報主体の権利・義務及び行使方法
            </h2>
            <p className="leading-relaxed mb-4">
                情報主体は、当社に対していつでも以下の各号の個人情報保護に関する権利を行使することができます。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>個人情報の閲覧請求</li>
                <li>誤り等がある場合の訂正請求</li>
                <li>削除請求</li>
                <li>処理停止請求</li>
            </ul>
            <p className="leading-relaxed">
                権利の行使は、当社に対し書面、電話、電子メール等を通じて行うことができ、当社は遅滞なく対応いたします。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 個人情報の破棄
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、個人情報の保有期間の経過、処理目的の達成等により個人情報が不要となった場合は、遅滞なく当該個人情報を破棄します。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">破棄手続</h3>
            <p className="leading-relaxed mb-4">
                不要となった個人情報は、個人情報保護責任者の承認手続を経て破棄します。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">破棄方法</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>電子的ファイル：復元及び再生が不可能な方法で永久削除</li>
                <li>記録物、印刷物：裁断又は焼却</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">ファイルの自動破棄</h3>
            <p className="leading-relaxed">
                利用者がアップロードしたファイルは、指定した有効期限が満了すると自動的に直ちに破棄され、復元は不可能です。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                8. 個人情報の安全性確保措置
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、個人情報の安全性確保のために以下の措置を講じております。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>管理的措置：内部管理計画の策定・実施、従業員教育</li>
                <li>技術的措置：パスワードの暗号化保存、ハッキング等に備えたセキュリティプログラムの導入及び定期的な更新、アクセスログの保管及び改ざん防止、P2Pセキュア転送時のエンドツーエンド暗号化（E2E Encryption）の適用</li>
                <li>物理的措置：サーバールーム、資料保管室等へのアクセス制御</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                9. 個人情報保護責任者
            </h2>
            <p className="leading-relaxed mb-4">
                当社は、個人情報処理に関する業務を総括して責任を負い、個人情報処理に関連する情報主体の苦情処理及び被害救済のために、以下のとおり個人情報保護責任者を指定しております。
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <p className="font-semibold mb-2 dark:text-[#EDEDED]">個人情報保護責任者</p>
                <ul className="space-y-1 text-sm">
                    <li>氏名：朴珉圭（Mingyu Park）</li>
                    <li>役職：ShareAnything開発者</li>
                    <li>連絡先：support@shareany.app</li>
                </ul>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                10. 個人情報処理方針の変更
            </h2>
            <p className="leading-relaxed">
                本個人情報処理方針は、法令、政策又はセキュリティ技術の変更に伴い内容の追加、削除及び修正がある場合、施行日の最低7日前から告知事項を通じてお知らせいたします。
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                公告日：2026年2月15日
            </p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                施行日：2026年2月15日
            </p>
        </div>
    </div>
);

export default PrivacyPolicyJa;
