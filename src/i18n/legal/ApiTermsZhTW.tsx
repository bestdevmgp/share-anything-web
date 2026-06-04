import React from 'react';

const ApiTermsZhTW: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. 簡介
            </h2>
            <p className="leading-relaxed">
                本OpenAPI使用條款（以下簡稱「本條款」）規範您使用ShareAnything公開API（以下簡稱「OpenAPI」）的條件，包含API金鑰、請求限制及許可用途。本條款為ShareAnything一般使用條款之補充，使用OpenAPI即表示您同意本條款。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 身分驗證與API金鑰
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>所有OpenAPI請求必須在 <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">X-API-Key</code> 請求標頭中包含有效的API金鑰。</li>
                <li>API金鑰為您的個人憑證，請勿與第三方共享，或將其暴露於公開儲存庫、用戶端程式碼或其他公開環境中。</li>
                <li>建議為每個外部服務或用途單獨申請API金鑰，以降低金鑰洩露的影響範圍。</li>
                <li>如懷疑API金鑰已洩露，請立即在設定中撤銷該金鑰並申請新金鑰。</li>
                <li>如發現違規行為，ShareAnything可在不事先通知的情況下立即撤銷API金鑰。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. 請求限制
            </h2>
            <p className="leading-relaxed mb-4">
                為保障服務穩定性，OpenAPI對每個API金鑰實施請求頻率限制。各類端點的限制如下：
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">端點類型</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">涉及端點</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">限制</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">讀取</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/me, GET /v1/shares/…, GET /v1/me/uploads, GET /v1/me/downloads 等</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">500次/小時</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">上傳</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">POST /v1/uploads, POST /v1/uploads/multipart 系列</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">100次/小時</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">下載</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/shares/…/download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">300次/小時</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">P2P 訊號</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/ws/signaling</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">並行活躍 10 個 · 連線嘗試 30 次/分鐘</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ul className="list-decimal list-inside space-y-2 ml-4 mt-4">
                <li>超出限制將回傳HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code>。</li>
                <li>收到429回應時，請實作指數退避或重試延遲邏輯。</li>
                <li>P2P 訊號為長時間維持的 WebSocket 連線，因此以並行活躍連線數和每分鐘連線嘗試次數代替每小時請求次數進行限制。超出任一限制將於 WebSocket 升級階段被 429 拒絕。</li>
                <li>P2P 傳輸相關端點 (<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">POST /v1/p2p/sessions</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/p2p/sessions/&#123;code&#125;/status</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/turn/credentials</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/ws/signaling</code>) 需要獨立的 <strong>p2p_transfer</strong> 權限。申請 API 金鑰時必須明確選擇該權限。</li>
                <li>透過 WebRTC DataChannel 的實際檔案傳輸不經過本服務伺服器，因此不另行限速。但 Cloudflare TURN 中繼流量由本服務負擔，故意產生大量流量或濫用 TURN 中繼的行為將被禁止。</li>
                <li>反覆超出限制或故意繞過限制可能導致金鑰撤銷或帳戶暫停。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 禁止行為
            </h2>
            <p className="leading-relaxed mb-4">禁止透過OpenAPI進行以下行為：</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>發送垃圾郵件、實施網路釣魚或散布惡意軟體等違法行為</li>
                <li>對服務內容進行大規模自動爬取</li>
                <li>探測安全漏洞、入侵服務基礎設施或進行未經授權的壓力測試</li>
                <li>透過API上傳、共享或散布違法內容</li>
                <li>未經授權使用或共享他人的API金鑰</li>
                <li>干擾服務正常運作或影響其他使用者的使用</li>
                <li>違反適用法律法規的行為</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. 服務限制
            </h2>
            <p className="leading-relaxed mb-4">
                透過OpenAPI上傳的檔案適用與網頁服務相同的大小限制、有效期限及儲存規則，詳情請參閱{' '}
                <a href="/terms-of-use" className="underline underline-offset-2 can-hover:hover:text-gray-900 dark:can-hover:hover:text-[#EDEDED] transition-colors">ShareAnything使用條款</a>。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>一般上傳中單一檔案的最大容量為 <strong>3GB</strong>。P2P 安全傳輸不受此限制約束。超出時回傳 HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">413 Payload Too Large</code> 與錯誤代碼 <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">file_too_large</code>。</li>
                <li>每個 API 金鑰下，所有尚未過期的分享（分享代碼仍有效且未被刪除的全部分享）的檔案大小總和上限為 <strong>8GB</strong>。超出配額時回傳 HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code> 與錯誤代碼 <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">storage_quota_exceeded</code>。刪除既有分享或等待其過期即可收回配額。該上限僅適用於透過 OpenAPI（API 金鑰，<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">sak_</code>）上傳的檔案，不適用於個人權杖（<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">sat_</code>）上傳的檔案。</li>
                <li>單次上傳檔案數量等其他限制以一般使用條款為準。</li>
                <li>檔案有效期限到期後將自動刪除。</li>
                <li>ShareAnything可在必要時提前通知後修改服務限制。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 違規後果
            </h2>
            <p className="leading-relaxed mb-4">
                濫用OpenAPI或違反本條款可能導致以下後果：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>立即撤銷API金鑰（無需事先通知）</li>
                <li>暫停或永久終止使用者帳戶（涵蓋網頁、CLI在內的全部服務）</li>
                <li>永久禁止申請新的API金鑰</li>
                <li>情節嚴重者（涉及違法行為或犯罪），將採取法律行動並向相關主管機關舉報</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 條款變更
            </h2>
            <p className="leading-relaxed">
                ShareAnything保留隨時更新本條款的權利。重要變更將透過電子郵件或應用程式內通知告知使用者。條款生效後繼續使用OpenAPI即表示您接受更新後的條款。
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">生效日期</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本條款自2026年5月21日起生效。
            </p>
        </div>
    </div>
);

export default ApiTermsZhTW;
