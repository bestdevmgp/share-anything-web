import React from 'react';

const TermsOfUseJa: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第1条（目的）
            </h2>
            <p className="leading-relaxed">
                本約款は、ShareAnything（以下「当社」）が提供するファイル共有サービス（以下「サービス」）の利用に関して、当社と利用者の権利、義務及び責任事項、その他必要な事項を規定することを目的とします。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第2条（定義）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>「サービス」とは、当社が提供するファイルのアップロード、共有コードの生成及びファイルのダウンロードサービスを意味します。</li>
                <li>「利用者」とは、本約款に基づき当社が提供するサービスを利用する者をいいます。</li>
                <li>「共有コード」とは、アップロードされたファイルをダウンロードするために生成される固有の識別コードを意味します。</li>
                <li>「有効期間」とは、利用者がファイルのアップロード時に設定したファイルの保管期間を意味します。</li>
                <li>「P2Pセキュア転送」とは、WebRTC技術を基盤として送信者と受信者の間でファイルを直接転送するエンドツーエンド暗号化転送方式を意味します。</li>
                <li>「TURNサーバー」とは、P2P直接接続が不可能なネットワーク環境において、エンドツーエンド暗号化されたファイル転送を中継するCloudflare Realtime TURNサーバーを意味します。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第3条（約款の掲示と改定）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>当社は、本約款の内容を利用者が容易に確認できるよう、サービスの初期画面に掲示します。</li>
                <li>当社は、関係法令に違反しない範囲で本約款を改定することができます。</li>
                <li>当社が約款を改定する場合は、適用日及び改定事由を明示し、現行約款と併せて第1項の方法により、当該改定約款の適用日の7日前から適用日の前日まで告知します。</li>
                <li>利用者が改定約款の適用に同意しない場合、当社又は利用者はサービス利用契約を解除することができます。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第4条（会員登録）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>サービスの利用を希望する者は、Google、Naver、Kakao又はApple OAuth認証を通じて会員登録を申請します。</li>
                <li>当社は、以下の各号に該当する申請については、承認しない又は事後に利用契約を解除することができます。
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>他人の情報を盗用した場合</li>
                        <li>サービスの利用目的が違法又は不正な場合</li>
                        <li>その他当社が定めた利用申請要件を満たしていない場合</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第5条（サービスの提供）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>当社は、以下のサービスを提供します。
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>ファイルのアップロード及び保存</li>
                        <li>共有コードの生成及び管理</li>
                        <li>共有コードによるファイルのダウンロード</li>
                        <li>ファイルパスワード設定機能</li>
                        <li>ファイル有効期限設定機能</li>
                        <li>P2Pセキュア転送：WebRTC基盤のエンドツーエンド暗号化による直接ファイル転送</li>
                        <li>TURNリレー：P2P直接接続が不可能な場合、Cloudflare TURNサーバーを介したエンドツーエンド暗号化ファイル中継転送</li>
                    </ul>
                </li>
                <li>当社は、コンピュータ等の情報通信設備の保守点検、交換及び故障、通信途絶又は運営上相当の理由がある場合、サービスの提供を一時的に中断することができます。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第6条（ファイルの管理及び削除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>アップロードされたファイルは、利用者が設定した有効期間中保管されます。</li>
                <li>有効期間が満了したファイルは自動的に直ちに削除され、復元は不可能です。</li>
                <li>当社は、以下の各号に該当するファイルを事前通知なく削除することができます。
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>法令又は本約款に違反する違法なファイル</li>
                        <li>他人の著作権等の権利を侵害するファイル</li>
                        <li>わいせつ物、暴力的コンテンツ等、公序良俗に反するファイル</li>
                        <li>マルウェア、ウイルス等が含まれたファイル</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第7条（利用者の義務）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>利用者は、以下の行為を行ってはなりません。
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>他人の情報の盗用</li>
                        <li>当社が掲示した情報の改変</li>
                        <li>当社のサーバー及びネットワークに対するハッキング又は攻撃</li>
                        <li>違法又は不正なファイルのアップロード及び共有</li>
                        <li>サービスを利用した営利行為</li>
                        <li>その他関係法令に違反する行為</li>
                    </ul>
                </li>
                <li>利用者は、関係法令、本約款の規定、利用案内及びサービスに関して告知された注意事項等を遵守しなければなりません。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第8条（著作権の帰属）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>サービスに対する著作権及び知的財産権は当社に帰属します。</li>
                <li>利用者がアップロードしたファイルの著作権は当該利用者に帰属し、当社はサービス提供目的以外に利用者のファイルを使用しません。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第9条（当社の免責）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>当社は、天災地変、戦争、基幹通信事業者のサービス停止等の不可抗力によりサービスを提供できない場合、責任を免れます。</li>
                <li>当社は、利用者の帰責事由によるサービス利用の障害について責任を負いません。</li>
                <li>当社は、利用者がアップロードしたファイルの内容、正確性、適法性について責任を負いません。</li>
                <li>当社は、利用者間又は利用者と第三者間においてサービスを介して発生した紛争に介入する義務はなく、これによる損害を賠償する責任もありません。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第10条（個人情報保護）
            </h2>
            <p className="leading-relaxed">
                当社は、関係法令の定めるところに従い、利用者の個人情報を保護するために努めます。個人情報の保護及び利用については、関係法令及び当社の個人情報処理方針が適用されます。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第11条（利用契約の解除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>利用者は、いつでも退会により利用契約を解除することができます。</li>
                <li>当社は、利用者が以下の各号に該当する場合、事前通知の上、利用契約を解除することができます。
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>本約款に違反した場合</li>
                        <li>サービスの正常な運営を妨害した場合</li>
                        <li>その他当社が合理的に判断してサービスの提供が困難な場合</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第12条（損害賠償）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>当社又は利用者は、本約款に違反して相手方に損害を与えた場合、その損害を賠償する責任を負います。</li>
                <li>ただし、責任ある事由がない場合は責任を負いません。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第13条（紛争の解決）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>当社と利用者は、サービスに関して発生した紛争を円満に解決するために必要なあらゆる努力をしなければなりません。</li>
                <li>第1項の努力にもかかわらず紛争が解決しない場合、両当事者は民事訴訟法上の管轄裁判所に訴えを提起することができます。</li>
            </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">付則</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本約款は2026年2月15日から適用されます。
            </p>
        </div>
    </div>
);

export default TermsOfUseJa;
