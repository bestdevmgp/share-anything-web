import React from 'react';

const ApiTermsKo: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제1조 (목적)
            </h2>
            <p className="leading-relaxed">
                본 OpenAPI 이용약관(이하 "본 약관")은 ShareAnything(이하 "서비스")이 제공하는 공개 API(이하 "OpenAPI")의 이용에 관하여 서비스와 이용자의 권리·의무 및 책임사항을 규정합니다. 본 약관은 ShareAnything 일반 이용약관에 더하여 적용되며, OpenAPI를 이용하는 경우 본 약관에 동의한 것으로 간주합니다. API 키를 통한 OpenAPI 이용에는 인증 방식, 요청 한도, 금지 행위 및 이용 제한 사항이 포함됩니다.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제2조 (인증 및 API 키)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>OpenAPI에 접근하려면 <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">X-API-Key</code> 요청 헤더에 유효한 API 키를 포함하여야 합니다.</li>
                <li>API 키는 이용자 본인만이 사용할 수 있는 고유한 인증 수단입니다. 키를 제3자와 공유하거나 공개 저장소, 클라이언트 측 코드, 공개 환경 등에 노출하여서는 안 됩니다.</li>
                <li>하나의 외부 서비스 또는 용도별로 별도의 API 키를 발급받아 사용할 것을 권장합니다. 이를 통해 키 유출 시 피해 범위를 최소화할 수 있습니다.</li>
                <li>API 키가 유출되거나 무단 사용이 의심되는 경우 즉시 서비스 설정에서 해당 키를 폐기하고 새로운 키를 발급받아야 합니다.</li>
                <li>서비스는 이용자의 요청 또는 이용약관 위반이 확인된 경우 사전 통지 없이 API 키를 즉시 폐기할 수 있습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제3조 (요청 한도)
            </h2>
            <p className="leading-relaxed mb-4">
                OpenAPI는 서비스 안정성 보장을 위해 API 키 단위로 요청 한도(Rate Limit)를 적용합니다. 각 엔드포인트 유형별 한도는 다음과 같습니다.
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">엔드포인트 유형</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">해당 엔드포인트</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">한도</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">읽기</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/me, GET /v1/shares/…, GET /v1/me/uploads, GET /v1/me/downloads 등</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">시간당 500건</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">업로드</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">POST /v1/uploads, POST /v1/uploads/multipart 계열</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">시간당 100건</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">다운로드</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/shares/…/download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">시간당 300건</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">P2P 시그널링</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/ws/signaling</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">동시 활성 10건 · 분당 연결 시도 30회</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ul className="list-decimal list-inside space-y-2 ml-4 mt-4">
                <li>요청 한도를 초과하면 HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code> 응답이 반환됩니다.</li>
                <li>429 응답을 수신한 경우 지수 백오프(exponential backoff) 또는 재시도 지연 로직을 구현하여야 합니다.</li>
                <li>P2P 시그널링은 장시간 유지되는 WebSocket 연결이므로 시간당 요청 횟수 대신 동시 활성 연결 수와 분당 연결 시도 횟수로 제한됩니다. 한도 초과 시 업그레이드 단계에서 429로 거부됩니다.</li>
                <li>P2P 전송 관련 엔드포인트(<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">POST /v1/p2p/sessions</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/p2p/sessions/&#123;code&#125;/status</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/turn/credentials</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/ws/signaling</code>)는 별도의 <strong>p2p_transfer</strong> 권한을 요구합니다. API 키 신청 시 해당 권한을 명시적으로 선택해야 사용 가능합니다.</li>
                <li>WebRTC DataChannel을 통한 실제 파일 송수신은 당사 서버를 경유하지 않으므로 별도 요청 한도가 적용되지 않으나, Cloudflare TURN 릴레이 트래픽은 당사 비용으로 발생합니다. 의도적인 대용량 트래픽 유발 또는 트래픽 우회·증폭 시도는 금지됩니다.</li>
                <li>반복적인 한도 초과 또는 의도적인 한도 우회 시도는 API 키 폐기 및 계정 이용 제한의 사유가 될 수 있습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제4조 (금지 행위)
            </h2>
            <p className="leading-relaxed mb-4">
                이용자는 OpenAPI를 이용하여 다음 각 호의 행위를 하여서는 안 됩니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>스팸, 피싱, 악성코드 배포 등 불법적이거나 유해한 목적에 API를 활용하는 행위</li>
                <li>서비스 내 콘텐츠를 대량 자동 수집(스크래핑)하는 행위</li>
                <li>서비스 서버, 인프라, 네트워크에 대한 보안 취약점 탐지, 침해 시도 또는 부하 테스트 행위</li>
                <li>불법 콘텐츠의 업로드·공유·배포를 위해 API를 활용하는 행위</li>
                <li>타인의 API 키를 무단으로 사용하거나 공유하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하거나 다른 이용자의 API 사용을 침해하는 행위</li>
                <li>관계 법령에서 금지하거나 공공질서 및 미풍양속에 반하는 행위</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제5조 (서비스 이용 제한)
            </h2>
            <p className="leading-relaxed mb-4">
                OpenAPI를 통해 처리되는 파일의 크기, 유효기간, 저장 정책은 일반 이용약관에서 정한 기준을 따릅니다. 세부 사항은{' '}
                <a href="/terms-of-use" className="underline underline-offset-2 can-hover:hover:text-gray-900 dark:can-hover:hover:text-[#EDEDED] transition-colors">ShareAnything 이용약관</a>을 참조하시기 바랍니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>업로드 파일의 최대 크기, 1회 업로드 파일 수 등의 제한은 일반 이용약관의 규정을 따릅니다.</li>
                <li>파일의 유효기간이 만료되면 자동으로 삭제되며, API를 통해 업로드된 파일에도 동일하게 적용됩니다.</li>
                <li>서비스는 서비스 운영상 필요한 경우 이용 제한 기준을 사전 공지 후 변경할 수 있습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제6조 (남용 및 위반에 대한 제재)
            </h2>
            <p className="leading-relaxed mb-4">
                OpenAPI를 악용하거나 본 약관을 위반하는 경우, 서비스는 다음 조치를 취할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>해당 API 키의 즉각적인 폐기 (사전 통지 없이 이루어질 수 있음)</li>
                <li>이용자 계정의 일시 정지 또는 영구 해지 (웹 서비스·CLI 포함 전체 서비스 대상)</li>
                <li>향후 API 키 발급의 영구적 제한</li>
                <li>불법 행위, 범죄적 남용 등 심각한 위반의 경우 관련 법령에 따른 법적 조치 및 수사기관 신고</li>
            </ul>
            <p className="leading-relaxed mt-4">
                서비스는 이용자의 API 사용 패턴이 정상적인 이용 범위를 현저히 벗어나거나 서비스 안정성에 위협을 가하는 경우 즉시 조치를 취할 권한을 보유합니다.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제7조 (약관의 변경)
            </h2>
            <p className="leading-relaxed">
                서비스는 관련 법령 또는 운영상 필요에 따라 본 약관을 변경할 수 있습니다. 약관이 변경되는 경우 이메일 또는 서비스 내 공지를 통해 이용자에게 사전 고지합니다. 변경된 약관의 효력 발생일 이후에도 OpenAPI를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">부칙</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                본 약관은 2026년 5월 21일부터 적용됩니다.
            </p>
        </div>
    </div>
);

export default ApiTermsKo;
