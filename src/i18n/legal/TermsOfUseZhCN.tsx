import React from 'react';

const TermsOfUseZhCN: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第1条（目的）
            </h2>
            <p className="leading-relaxed">
                本服务条款旨在规定ShareAnything（以下简称"公司"）提供的文件共享服务（以下简称"服务"）的使用过程中，公司与用户之间的权利、义务和责任，以及其他必要事项。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第2条（定义）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>"服务"是指公司提供的文件上传、共享码生成和文件下载服务。</li>
                <li>"用户"是指根据本条款使用公司所提供服务的人。</li>
                <li>"共享码"是指为下载已上传文件而生成的唯一识别码。</li>
                <li>"有效期"是指用户上传文件时设定的文件保留期限。</li>
                <li>"P2P安全传输"是指基于WebRTC技术，在发送方和接收方之间直接传输文件的端到端加密传输方式。</li>
                <li>"TURN服务器"是指在无法建立直接P2P连接的网络环境下，中继端到端加密文件传输的Cloudflare Realtime TURN服务器。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第3条（条款的公示与修订）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司应将本条款内容公布在服务的首页上，以便用户轻松查阅。</li>
                <li>公司可在不违反相关法律的范围内修订本条款。</li>
                <li>公司修订条款时，应明确生效日期和修订原因，并按照第1款的方式，从生效日期前7天至生效日期前一天，与现行条款一并公告。</li>
                <li>用户不同意修订后的条款时，公司或用户可以解除服务协议。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第4条（会员注册）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>希望使用服务的人应通过Google、Naver、Kakao或Apple OAuth认证进行会员注册。</li>
                <li>对于存在以下情形的申请，公司可以拒绝批准或事后解除服务协议：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>冒用他人信息</li>
                        <li>使用服务的目的违法或不正当</li>
                        <li>其他未满足公司规定的申请条件的情况</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第5条（服务的提供）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司提供以下服务：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>文件上传和存储</li>
                        <li>共享码生成和管理</li>
                        <li>通过共享码下载文件</li>
                        <li>文件密码保护功能</li>
                        <li>文件有效期设置功能</li>
                        <li>P2P安全传输：基于WebRTC的端到端加密直接文件传输</li>
                        <li>TURN中继：在无法建立直接P2P连接时，通过Cloudflare TURN服务器进行端到端加密文件中继传输</li>
                    </ul>
                </li>
                <li>因电脑等信息通信设施的维护、更换或故障、网络中断或其他重大运营原因，公司可暂时中止服务的提供。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第6条（文件管理与删除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>上传的文件按用户设定的有效期保留。</li>
                <li>有效期届满的文件将被自动立即删除，且无法恢复。</li>
                <li>对于存在以下情形的文件，公司可不经事先通知予以删除：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>违反法律或本条款的非法文件</li>
                        <li>侵犯他人著作权或其他权利的文件</li>
                        <li>含有色情或暴力内容等违背公序良俗的文件</li>
                        <li>含有恶意代码、病毒等的文件</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第7条（用户的义务）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>用户不得从事以下行为：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>冒用他人信息</li>
                        <li>篡改公司发布的信息</li>
                        <li>攻击或入侵公司的服务器和网络</li>
                        <li>上传和共享非法或不正当的文件</li>
                        <li>利用服务从事商业活动</li>
                        <li>其他违反相关法律的行为</li>
                    </ul>
                </li>
                <li>用户应遵守相关法律、本条款的规定、使用指南以及与服务相关的公告。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第8条（著作权的归属）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>服务的著作权和知识产权归公司所有。</li>
                <li>用户上传文件的著作权归该用户所有，公司不会将用户文件用于服务提供以外的目的。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第9条（责任限制）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>因自然灾害、战争或电信运营商中止服务等不可抗力导致无法提供服务时，公司免除责任。</li>
                <li>因用户原因造成的服务中断，公司不承担责任。</li>
                <li>公司对用户上传文件的内容、准确性或合法性不承担责任。</li>
                <li>公司无义务介入因服务使用而发生的用户之间或用户与第三方之间的纠纷，并对由此产生的损害不承担责任。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第10条（个人信息的保护）
            </h2>
            <p className="leading-relaxed">
                公司依据相关法律努力保护用户的个人信息。个人信息的保护和使用适用公司的隐私政策及相关法律。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第11条（服务协议的解除）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>用户可随时通过注销会员来解除服务协议。</li>
                <li>用户存在以下情形时，公司可在事先通知后解除服务协议：
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>违反本条款</li>
                        <li>妨碍服务的正常运营</li>
                        <li>公司合理判断难以继续提供服务的其他情况</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第12条（损害赔偿）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司或用户因违反本条款给对方造成损害的，应承担赔偿责任。</li>
                <li>但无可归责事由时，任何一方均不承担责任。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                第13条（争议解决）
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>公司与用户应尽一切努力友好解决因服务使用而产生的争议。</li>
                <li>经第1款所述努力仍未解决争议时，任何一方均可向《民事诉讼法》规定的有管辖权的法院提起诉讼。</li>
            </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">附则</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本条款自2026年2月15日起生效。
            </p>
        </div>
    </div>
);

export default TermsOfUseZhCN;
