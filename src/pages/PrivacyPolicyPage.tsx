import React, { useEffect } from 'react';

const PrivacyPolicyPage: React.FC = () => {
    useEffect(() => {
        document.title = '개인정보처리방침';
    }, []);

    return (
        <div>
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-white/10 px-12 py-8 md:px-20 md:py-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-8">
                        ShareAnything 개인정보처리방침
                    </h1>

                    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                1. 개인정보의 처리 목적
                            </h2>
                            <p className="leading-relaxed mb-4">
                                ShareAnything(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>회원 가입 및 관리: 회원제 서비스 제공, 본인확인, 회원자격 유지·관리, 서비스 부정이용 방지</li>
                                <li>서비스 제공: 파일 업로드 및 다운로드 서비스 제공, 공유 코드 생성 및 관리</li>
                                <li>서비스 개선: 서비스 이용 통계 분석 및 서비스 개선</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                2. 처리하는 개인정보의 항목
                            </h2>
                            <div className="leading-relaxed">
                                <p className="mb-4">회사는 OAuth 인증을 통해 최소한의 개인정보만을 수집합니다.</p>

                                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">필수 수집 항목</h3>
                                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                    <li>Google OAuth 로그인 시: 이메일 주소, 이름, 프로필 사진</li>
                                    <li>Naver OAuth 로그인 시: 이메일 주소, 이름</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">자동 수집 항목</h3>
                                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                    <li>서비스 이용 기록, IP 주소</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">파일 관련 정보</h3>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>업로드한 파일명, 파일 크기, 업로드 일시</li>
                                    <li>공유 코드, 파일 유효기간</li>
                                    <li>파일 비밀번호(암호화 저장)</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                3. 개인정보의 처리 및 보유 기간
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                <li>회원정보: 회원 탈퇴 시까지 보유. 단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지 보유</li>
                                <li>업로드된 파일: 사용자가 지정한 유효기간까지 보유하며, 유효기간 만료 시 즉시 파기</li>
                                <li>서비스 이용 기록: 3개월 보관 후 파기</li>
                            </ul>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2">관계 법령에 따른 보유</h3>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                                <li>접속에 관한 기록: 3개월 (통신비밀보호법)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                4. 개인정보의 제3자 제공
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                            </p>
                            <p className="leading-relaxed">
                                현재 회사는 개인정보를 제3자에게 제공하지 않습니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                5. 개인정보처리의 위탁
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse">
                                    <thead>
                                    <tr className="bg-gray-50 dark:bg-white/5">
                                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">위탁받는 자</th>
                                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">위탁하는 업무의 내용</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Google LLC</td>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth 인증 서비스</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Naver Corp.</td>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth 인증 서비스</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Amazon Web Services, Inc.</td>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">서버 호스팅</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Cloudflare, Inc.</td>
                                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">파일 저장</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="leading-relaxed mt-4">
                                회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                6. 정보주체의 권리·의무 및 행사방법
                            </h2>
                            <p className="leading-relaxed mb-4">
                                정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                <li>개인정보 열람 요구</li>
                                <li>오류 등이 있을 경우 정정 요구</li>
                                <li>삭제 요구</li>
                                <li>처리정지 요구</li>
                            </ul>
                            <p className="leading-relaxed">
                                권리 행사는 회사에 대해 서면, 전화, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                7. 개인정보의 파기
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                            </p>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2">파기 절차</h3>
                            <p className="leading-relaxed mb-4">
                                불필요한 개인정보는 개인정보 보호책임자의 승인 절차를 거쳐 파기합니다.
                            </p>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2">파기 방법</h3>
                            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                <li>전자적 파일: 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
                                <li>기록물, 인쇄물: 분쇄 또는 소각</li>
                            </ul>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2">파일 자동 파기</h3>
                            <p className="leading-relaxed">
                                사용자가 업로드한 파일은 지정한 유효기간이 만료되면 자동으로 즉시 파기되며, 복구가 불가능합니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                8. 개인정보의 안전성 확보조치
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>관리적 조치: 내부관리계획 수립·시행, 직원 교육</li>
                                <li>기술적 조치: 비밀번호 암호화 저장, 해킹 등에 대비한 보안프로그램 설치 및 주기적 갱신, 접속기록의 보관 및 위변조 방지</li>
                                <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                9. 개인정보 보호책임자
                            </h2>
                            <p className="leading-relaxed mb-4">
                                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                            </p>
                            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                                <p className="font-semibold mb-2 dark:text-[#EDEDED]">개인정보 보호책임자</p>
                                <ul className="space-y-1 text-sm">
                                    <li>성명: 박민규</li>
                                    <li>직책: ShareAnything 개발자</li>
                                    <li>연락처: me@mingyu.dev</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                                10. 개인정보 처리방침 변경
                            </h2>
                            <p className="leading-relaxed">
                                본 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시 시행일자 최소 7일 전부터 공지사항을 통해 고지할 것입니다.
                            </p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                            <p className="text-sm text-gray-600 dark:text-[#888888]">
                                공고일자: 2025년 11월 22일
                            </p>
                            <p className="text-sm text-gray-600 dark:text-[#888888]">
                                시행일자: 2025년 11월 22일
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;