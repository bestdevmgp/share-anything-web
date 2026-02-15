import React from 'react';

const PrivacyPolicyZhCN: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. 个人信息的处理目的
            </h2>
            <p className="leading-relaxed mb-4">
                ShareAnything（以下简称"公司"）出于以下目的处理个人信息。所收集的个人信息不会用于以下所述目的之外的其他用途。如果使用目的发生变更，公司将根据《个人信息保护法》第18条的规定，采取获得单独同意等必要措施。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>会员注册与管理：提供会员服务、身份验证、维护和管理会员资格、防止服务被非法使用</li>
                <li>服务提供：提供文件上传和下载服务、生成和管理共享码</li>
                <li>服务改进：分析服务使用统计数据并改进服务</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 处理的个人信息类别
            </h2>
            <div className="leading-relaxed">
                <p className="mb-4">公司仅通过OAuth认证收集最少限度的个人信息。</p>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">必需项目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>通过Google OAuth登录时：邮箱、姓名、头像</li>
                    <li>通过Naver OAuth登录时：邮箱、姓名</li>
                    <li>通过Kakao OAuth登录时：邮箱、昵称、头像</li>
                    <li>通过Apple OAuth登录时：邮箱、姓名</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">自动收集项目</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>服务使用记录、IP地址</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">文件相关信息</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>上传的文件名、文件大小、上传日期和时间</li>
                    <li>共享码、文件有效期</li>
                    <li>文件密码（加密存储）</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">P2P安全传输</h3>
                <p className="ml-4">使用P2P安全传输时，文件不会存储在服务器上，而是在发送方和接收方之间直接传输。公司不会访问P2P传输文件的内容，仅记录传输元数据（传输时间、文件大小等）。</p>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. 个人信息的处理及保留期限
            </h2>
            <p className="leading-relaxed mb-4">
                公司在法律规定的保留和使用期限内，或在收集个人信息时经信息主体同意的保留和使用期限内，处理和保留个人信息。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>会员信息：保留至会员注销时。但如果因违反相关法律而正在进行调查或查询，则保留至该调查或查询结束</li>
                <li>上传的文件：保留至用户设定的有效期限，到期后立即销毁</li>
                <li>服务使用记录：保留3个月后销毁</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">依据相关法律的保留</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>合同或撤回订阅记录：5年（《电子商务消费者保护法》）</li>
                <li>消费者投诉或争议处理记录：3年（《电子商务消费者保护法》）</li>
                <li>访问日志记录：3个月（《通信秘密保护法》）</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 向第三方提供个人信息
            </h2>
            <p className="leading-relaxed mb-4">
                公司仅在第1条（个人信息处理目的）规定的范围内处理个人信息，仅在符合《个人信息保护法》第17条规定的情形（如信息主体同意或法律有特别规定）时，才向第三方提供个人信息。
            </p>
            <p className="leading-relaxed">
                目前，公司不向第三方提供个人信息。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. 个人信息处理的委托
            </h2>
            <p className="leading-relaxed mb-4">
                公司为顺利处理个人信息业务，将个人信息处理委托如下。
            </p>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse">
                    <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">受托方</th>
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">委托业务内容</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Google LLC</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth认证服务</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Naver Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth认证服务</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Kakao Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth认证服务</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Apple Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth认证服务</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Amazon Web Services, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">服务器托管</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Cloudflare, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">文件存储、TURN中继服务（P2P安全传输）</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <p className="leading-relaxed mt-4">
                公司在签订委托合同时，根据《个人信息保护法》第26条，以书面形式明确规定禁止超出委托业务目的处理个人信息、技术和管理保护措施、再委托限制、对受托方的管理和监督、损害赔偿等责任事项，并监督受托方是否安全处理个人信息。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 信息主体的权利义务及行使方式
            </h2>
            <p className="leading-relaxed mb-4">
                信息主体可随时向公司行使以下与个人信息保护相关的权利。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>请求查阅个人信息</li>
                <li>请求更正错误信息</li>
                <li>请求删除个人信息</li>
                <li>请求停止处理个人信息</li>
            </ul>
            <p className="leading-relaxed">
                权利可通过书面、电话或电子邮件向公司提出，公司将立即采取措施。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 个人信息的销毁
            </h2>
            <p className="leading-relaxed mb-4">
                当个人信息不再需要时，如保留期限届满或处理目的已达成，公司将立即销毁该个人信息。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">销毁程序</h3>
            <p className="leading-relaxed mb-4">
                不再需要的个人信息经个人信息保护负责人批准后销毁。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">销毁方式</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>电子文件：使用无法恢复和再生的方式永久删除</li>
                <li>纸质记录和印刷品：粉碎或焚烧</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">文件自动销毁</h3>
            <p className="leading-relaxed">
                用户上传的文件在设定的有效期限届满时自动立即销毁，且无法恢复。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                8. 保障个人信息安全的措施
            </h2>
            <p className="leading-relaxed mb-4">
                公司采取以下措施保障个人信息的安全。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>管理措施：制定和实施内部管理计划、员工培训</li>
                <li>技术措施：密码加密存储、安装和定期更新防黑客安全程序、保留和防止篡改访问日志、P2P安全传输时应用端到端加密（E2E Encryption）</li>
                <li>物理措施：对服务器机房、数据存储设施等进行访问控制</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                9. 个人信息保护负责人
            </h2>
            <p className="leading-relaxed mb-4">
                公司指定以下个人信息保护负责人，全面负责个人信息处理工作，并处理信息主体关于个人信息处理的投诉和救济。
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <p className="font-semibold mb-2 dark:text-[#EDEDED]">个人信息保护负责人</p>
                <ul className="space-y-1 text-sm">
                    <li>姓名: 朴珉圭</li>
                    <li>职务: ShareAnything开发者</li>
                    <li>联系方式: me@mingyu.dev</li>
                </ul>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                10. 隐私政策的变更
            </h2>
            <p className="leading-relaxed">
                本隐私政策可能因法律、政策或安全技术的变更而修订。任何内容的增加、删除或修改将在生效日期前至少7天通过公告通知。
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

export default PrivacyPolicyZhCN;
