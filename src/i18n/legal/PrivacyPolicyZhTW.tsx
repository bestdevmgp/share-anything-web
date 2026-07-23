import React from 'react';

const PrivacyPolicyZhTW: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. 個人資料的處理目的
            </h2>
            <p className="leading-relaxed mb-4">
                ShareAnything（以下簡稱「公司」）基於以下目的處理個人資料。所蒐集的個人資料不會用於以下所述目的以外的其他用途。如果使用目的發生變更，公司將依據《個人資料保護法》第18條之規定，採取取得個別同意等必要措施。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>會員註冊與管理：提供會員服務、身分驗證、維護與管理會員資格、防止服務遭非法使用</li>
                <li>服務提供：提供檔案上傳和下載服務、產生和管理分享碼</li>
                <li>服務改善：分析服務使用統計資料並改善服務</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 處理的個人資料類別
            </h2>
            <div className="leading-relaxed">
                <p className="mb-4">公司僅透過OAuth認證蒐集最少限度的個人資料。</p>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">必要項目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>透過Google OAuth登入時：電子郵件、姓名、個人照片</li>
                    <li>透過Naver OAuth登入時：電子郵件、姓名</li>
                    <li>透過Kakao OAuth登入時：電子郵件、暱稱、個人照片</li>
                    <li>透過Apple OAuth登入時：電子郵件、姓名</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">自動蒐集項目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>服務使用紀錄、IP位址</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">檔案相關資訊</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>上傳的檔案名稱、檔案大小、上傳日期和時間</li>
                    <li>分享碼、檔案有效期限</li>
                    <li>檔案密碼（加密儲存）</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">P2P安全傳輸</h3>
                <p className="ml-4">使用P2P安全傳輸時，檔案不會儲存在伺服器上，而是在傳送方和接收方之間直接傳輸。公司不會存取P2P傳輸檔案的內容，僅記錄傳輸中繼資料（傳輸時間、檔案大小等）。</p>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. 個人資料的處理及保留期間
            </h2>
            <p className="leading-relaxed mb-4">
                公司在法律規定的保留及使用期間內，或在蒐集個人資料時經當事人同意的保留及使用期間內，處理並保留個人資料。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>會員資料：保留至會員註銷時。但如因違反相關法律正在進行調查或查詢，則保留至該調查或查詢結束</li>
                <li>上傳的檔案：保留至使用者設定的有效期限，到期後立即銷毀</li>
                <li>服務使用紀錄：保留3個月後銷毀</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">依據相關法律之保留</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>契約或撤回訂閱紀錄：5年（《電子商務消費者保護法》）</li>
                <li>消費者申訴或爭議處理紀錄：3年（《電子商務消費者保護法》）</li>
                <li>存取日誌紀錄：3個月（《通訊秘密保護法》）</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 向第三方提供個人資料
            </h2>
            <p className="leading-relaxed mb-4">
                公司僅在第1條（個人資料處理目的）所規定的範圍內處理個人資料，僅在符合《個人資料保護法》第17條所規定的情形（如當事人同意或法律有特別規定）時，才向第三方提供個人資料。
            </p>
            <p className="leading-relaxed">
                目前，公司不向第三方提供個人資料。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. 個人資料處理之委託
            </h2>
            <p className="leading-relaxed mb-4">
                公司為順利處理個人資料業務，將個人資料處理委託如下。
            </p>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse">
                    <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">受託方</th>
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">委託業務內容</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Google LLC</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認證服務</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Naver Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認證服務</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Kakao Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認證服務</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Apple Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth認證服務</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Amazon Web Services, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">伺服器託管</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Cloudflare, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">檔案儲存、TURN中繼服務（P2P安全傳輸）</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <p className="leading-relaxed mt-4">
                公司在簽訂委託合約時，依據《個人資料保護法》第26條，以書面形式明確規定禁止超出委託業務目的處理個人資料、技術及管理保護措施、再委託限制、對受託方之管理與監督、損害賠償等責任事項，並監督受託方是否安全處理個人資料。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 當事人的權利義務及行使方式
            </h2>
            <p className="leading-relaxed mb-4">
                當事人可隨時向公司行使以下與個人資料保護相關的權利。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>請求查閱個人資料</li>
                <li>請求更正錯誤資料</li>
                <li>請求刪除個人資料</li>
                <li>請求停止處理個人資料</li>
            </ul>
            <p className="leading-relaxed">
                權利可透過書面、電話或電子郵件向公司提出，公司將立即採取措施。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 個人資料的銷毀
            </h2>
            <p className="leading-relaxed mb-4">
                當個人資料不再需要時，如保留期限屆滿或處理目的已達成，公司將立即銷毀該個人資料。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">銷毀程序</h3>
            <p className="leading-relaxed mb-4">
                不再需要的個人資料經個人資料保護負責人核准後銷毀。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">銷毀方式</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>電子檔案：使用無法復原和再生的方式永久刪除</li>
                <li>紙本紀錄和印刷品：碎紙或焚燒</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">檔案自動銷毀</h3>
            <p className="leading-relaxed">
                使用者上傳的檔案在設定的有效期限屆滿時自動立即銷毀，且無法復原。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                8. 保障個人資料安全之措施
            </h2>
            <p className="leading-relaxed mb-4">
                公司採取以下措施保障個人資料的安全。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>管理措施：制定並實施內部管理計畫、員工教育訓練</li>
                <li>技術措施：密碼加密儲存、安裝並定期更新防駭客安全程式、保留並防止竄改存取日誌、P2P安全傳輸時採用端對端加密（E2E Encryption）</li>
                <li>實體措施：對伺服器機房、資料儲存設施等進行存取管制</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                9. 個人資料保護負責人
            </h2>
            <p className="leading-relaxed mb-4">
                公司指定以下個人資料保護負責人，全面負責個人資料處理工作，並處理當事人關於個人資料處理的申訴與救濟。
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <p className="font-semibold mb-2 dark:text-[#EDEDED]">個人資料保護負責人</p>
                <ul className="space-y-1 text-sm">
                    <li>姓名: 朴珉圭</li>
                    <li>職務: ShareAnything開發者</li>
                    <li>聯絡方式: support@shareany.app</li>
                </ul>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                10. 隱私權政策的變更
            </h2>
            <p className="leading-relaxed">
                本隱私權政策可能因法律、政策或安全技術的變更而修訂。任何內容的新增、刪除或修改將在生效日期前至少7天透過公告通知。
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                公告日期: 2026年2月15日
            </p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                生效日期: 2026年2月15日
            </p>
        </div>
    </div>
);

export default PrivacyPolicyZhTW;
