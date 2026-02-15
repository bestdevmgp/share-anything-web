import React from 'react';

const TermsOfUseZhTW: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第1條（目的）
            </h2>
            <p className="leading-relaxed">
                本服務條款旨在規定ShareAnything（以下簡稱「公司」）所提供的檔案分享服務（以下簡稱「服務」）的使用過程中，公司與使用者之間的權利、義務和責任，以及其他必要事項。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第2條（定義）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>「服務」是指公司提供的檔案上傳、分享碼產生和檔案下載服務。</li>
                <li>「使用者」是指依據本條款使用公司所提供服務的人。</li>
                <li>「分享碼」是指為下載已上傳檔案而產生的唯一識別碼。</li>
                <li>「有效期限」是指使用者上傳檔案時設定的檔案保留期間。</li>
                <li>「P2P安全傳輸」是指基於WebRTC技術，在傳送方和接收方之間直接傳輸檔案的端對端加密傳輸方式。</li>
                <li>「TURN伺服器」是指在無法建立直接P2P連線的網路環境下，中繼端對端加密檔案傳輸的Cloudflare Realtime TURN伺服器。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第3條（條款的公示與修訂）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司應將本條款內容公佈在服務的首頁上，以便使用者輕鬆查閱。</li>
                <li>公司得在不違反相關法律的範圍內修訂本條款。</li>
                <li>公司修訂條款時，應明確生效日期和修訂原因，並依照第1項的方式，從生效日期前7天至生效日期前一天，與現行條款一併公告。</li>
                <li>使用者不同意修訂後的條款時，公司或使用者得解除服務契約。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第4條（會員註冊）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>希望使用服務之人應透過Google、Naver、Kakao或Apple OAuth認證進行會員註冊。</li>
                <li>對於有下列情形之申請，公司得拒絕核准或事後解除服務契約：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>冒用他人資料</li>
                        <li>使用服務的目的違法或不正當</li>
                        <li>其他未符合公司規定之申請條件的情況</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第5條（服務的提供）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司提供以下服務：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>檔案上傳和儲存</li>
                        <li>分享碼產生和管理</li>
                        <li>透過分享碼下載檔案</li>
                        <li>檔案密碼保護功能</li>
                        <li>檔案有效期限設定功能</li>
                        <li>P2P安全傳輸：基於WebRTC的端對端加密直接檔案傳輸</li>
                        <li>TURN中繼：在無法建立直接P2P連線時，透過Cloudflare TURN伺服器進行端對端加密檔案中繼傳輸</li>
                    </ul>
                </li>
                <li>因電腦等資訊通訊設施的維護、更換或故障、網路中斷或其他重大營運原因，公司得暫時中止服務的提供。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第6條（檔案管理與刪除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>上傳的檔案依使用者設定的有效期限保留。</li>
                <li>有效期限屆滿的檔案將被自動立即刪除，且無法復原。</li>
                <li>對於有下列情形之檔案，公司得不經事先通知予以刪除：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>違反法律或本條款之非法檔案</li>
                        <li>侵害他人著作權或其他權利之檔案</li>
                        <li>含有色情或暴力內容等違背公序良俗之檔案</li>
                        <li>含有惡意程式碼、病毒等之檔案</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第7條（使用者的義務）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>使用者不得從事以下行為：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>冒用他人資料</li>
                        <li>竄改公司發佈的資訊</li>
                        <li>攻擊或入侵公司的伺服器和網路</li>
                        <li>上傳和分享非法或不正當的檔案</li>
                        <li>利用服務從事商業活動</li>
                        <li>其他違反相關法律之行為</li>
                    </ul>
                </li>
                <li>使用者應遵守相關法律、本條款之規定、使用指南以及與服務相關的公告。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第8條（著作權的歸屬）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>服務的著作權和智慧財產權歸公司所有。</li>
                <li>使用者上傳檔案的著作權歸該使用者所有，公司不會將使用者的檔案用於服務提供以外的目的。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第9條（責任限制）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>因天災、戰爭或電信業者中止服務等不可抗力導致無法提供服務時，公司免除責任。</li>
                <li>因使用者原因造成的服務中斷，公司不承擔責任。</li>
                <li>公司對使用者上傳檔案的內容、準確性或合法性不承擔責任。</li>
                <li>公司無義務介入因服務使用而發生的使用者之間或使用者與第三方之間的糾紛，並對因此產生的損害不承擔責任。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第10條（個人資料的保護）
            </h2>
            <p className="leading-relaxed">
                公司依據相關法律致力於保護使用者的個人資料。個人資料的保護及使用適用公司的隱私權政策及相關法律。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第11條（服務契約的解除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>使用者得隨時透過註銷會員來解除服務契約。</li>
                <li>使用者有下列情形時，公司得於事先通知後解除服務契約：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>違反本條款</li>
                        <li>妨礙服務的正常營運</li>
                        <li>公司合理判斷難以繼續提供服務的其他情況</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第12條（損害賠償）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司或使用者因違反本條款致他方受有損害者，應負賠償責任。</li>
                <li>但無可歸責事由者，任何一方均不負責任。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第13條（爭議解決）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司與使用者應盡一切努力友好解決因服務使用而產生的爭議。</li>
                <li>經第1項所述努力仍未解決爭議時，任何一方均得向《民事訴訟法》規定之管轄法院提起訴訟。</li>
            </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">附則</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本條款自2026年2月15日起生效。
            </p>
        </div>
    </div>
);

export default TermsOfUseZhTW;
