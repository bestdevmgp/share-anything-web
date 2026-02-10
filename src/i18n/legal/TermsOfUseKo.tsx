import React from 'react';

const TermsOfUseKo: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제1조 (목적)
            </h2>
            <p className="leading-relaxed">
                본 약관은 ShareAnything(이하 "회사")이 제공하는 파일 공유 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제2조 (정의)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>"서비스"란 회사가 제공하는 파일 업로드, 공유 코드 생성 및 파일 다운로드 서비스를 의미합니다.</li>
                <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                <li>"공유 코드"란 업로드된 파일을 다운로드하기 위해 생성되는 고유 식별 코드를 의미합니다.</li>
                <li>"유효기간"이란 이용자가 파일 업로드 시 설정한 파일의 보관 기간을 의미합니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제3조 (약관의 게시와 개정)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
                <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
                <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 제1항의 방식에 따라 그 개정약관의 적용일자 7일 전부터 적용일자 전일까지 공지합니다.</li>
                <li>이용자가 개정약관의 적용에 동의하지 않는 경우 회사 또는 이용자는 서비스 이용계약을 해지할 수 있습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제4조 (회원가입)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>서비스 이용을 원하는 자는 Google 또는 Naver OAuth 인증을 통해 회원가입을 신청합니다.</li>
                <li>회사는 다음 각 호에 해당하는 신청에 대하여는 승인을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>타인의 정보를 도용한 경우</li>
                        <li>서비스 이용 목적이 불법적이거나 부정한 경우</li>
                        <li>기타 회사가 정한 이용신청 요건이 미비한 경우</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제5조 (서비스의 제공)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>회사는 다음과 같은 서비스를 제공합니다.
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>파일 업로드 및 저장</li>
                        <li>공유 코드 생성 및 관리</li>
                        <li>공유 코드를 통한 파일 다운로드</li>
                        <li>파일 비밀번호 설정 기능</li>
                        <li>파일 유효기간 설정 기능</li>
                    </ul>
                </li>
                <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제6조 (파일의 관리 및 삭제)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>업로드된 파일은 이용자가 설정한 유효기간 동안 보관됩니다.</li>
                <li>유효기간이 만료된 파일은 자동으로 즉시 삭제되며, 복구가 불가능합니다.</li>
                <li>회사는 다음 각 호에 해당하는 파일을 사전 통지 없이 삭제할 수 있습니다.
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>법령 또는 본 약관을 위반하는 불법적인 파일</li>
                        <li>타인의 저작권 등 권리를 침해하는 파일</li>
                        <li>음란물, 폭력물 등 공공질서 및 미풍양속에 반하는 파일</li>
                        <li>악성코드, 바이러스 등이 포함된 파일</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제7조 (이용자의 의무)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>이용자는 다음 행위를 하여서는 안 됩니다.
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>타인의 정보 도용</li>
                        <li>회사가 게시한 정보의 변경</li>
                        <li>회사의 서버 및 네트워크에 대한 해킹 또는 공격</li>
                        <li>불법적이거나 부정한 파일의 업로드 및 공유</li>
                        <li>서비스를 이용한 영리행위</li>
                        <li>기타 관계 법령에 위배되는 행위</li>
                    </ul>
                </li>
                <li>이용자는 관계법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항 등을 준수하여야 합니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제8조 (저작권의 귀속)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</li>
                <li>이용자가 업로드한 파일의 저작권은 해당 이용자에게 귀속되며, 회사는 서비스 제공 목적 외에 이용자의 파일을 사용하지 않습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제9조 (회사의 면책)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임지지 않습니다.</li>
                <li>회사는 이용자가 업로드한 파일의 내용, 정확성, 적법성에 대해 책임지지 않습니다.</li>
                <li>회사는 이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임도 없습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제10조 (개인정보보호)
            </h2>
            <p className="leading-relaxed">
                회사는 관계법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 관련법령 및 회사의 개인정보처리방침이 적용됩니다.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제11조 (이용계약의 해지)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>이용자는 언제든지 회원탈퇴를 통해 이용계약을 해지할 수 있습니다.</li>
                <li>회사는 이용자가 다음 각 호에 해당하는 경우 사전 통지 후 이용계약을 해지할 수 있습니다.
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>본 약관을 위반한 경우</li>
                        <li>서비스의 정상적인 운영을 방해한 경우</li>
                        <li>기타 회사가 합리적으로 판단하여 서비스 제공이 곤란한 경우</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제12조 (손해배상)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>회사 또는 이용자는 본 약관을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상할 책임이 있습니다.</li>
                <li>단, 책임 있는 사유가 없는 경우 책임을 지지 않습니다.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                제13조 (분쟁의 해결)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>회사와 이용자는 서비스와 관련하여 발생한 분쟁을 원만하게 해결하기 위하여 필요한 모든 노력을 하여야 합니다.</li>
                <li>제1항의 노력에도 불구하고 분쟁이 해결되지 않을 경우, 양 당사자는 민사소송법상의 관할법원에 소를 제기할 수 있습니다.</li>
            </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">부칙</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                본 약관은 2025년 11월 22일부터 적용됩니다.
            </p>
        </div>
    </div>
);

export default TermsOfUseKo;
