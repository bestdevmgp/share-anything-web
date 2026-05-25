import React from 'react';

const ApiTermsZhCN: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. 简介
            </h2>
            <p className="leading-relaxed">
                本OpenAPI使用条款（以下简称"本条款"）规定了您使用ShareAnything公开API（以下简称"OpenAPI"）的条件，包括API密钥、请求限制及许可用途。本条款是ShareAnything一般使用条款的补充，使用OpenAPI即表示您同意本条款。
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. 身份验证与API密钥
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>所有OpenAPI请求必须在 <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">X-API-Key</code> 请求头中包含有效的API密钥。</li>
                <li>API密钥是您的个人凭证，请勿与第三方共享，或将其暴露在公共仓库、客户端代码或其他公开环境中。</li>
                <li>建议为每个外部服务或用途单独申请API密钥，以降低密钥泄露的影响范围。</li>
                <li>如怀疑API密钥已泄露，请立即在设置中撤销该密钥并申请新密钥。</li>
                <li>如发现违规行为，ShareAnything可在不事先通知的情况下立即撤销API密钥。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. 请求限制
            </h2>
            <p className="leading-relaxed mb-4">
                为保障服务稳定性，OpenAPI对每个API密钥实施请求频率限制。各类端点的限制如下：
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">端点类型</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">涉及端点</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">限制</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">读取</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/me, GET /v1/shares/…, GET /v1/me/uploads, GET /v1/me/downloads 等</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">500次/小时</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">上传</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">POST /v1/uploads, POST /v1/uploads/multipart 系列</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">80次/小时</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">下载</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/shares/…/download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">150次/小时</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ul className="list-decimal list-inside space-y-2 ml-4 mt-4">
                <li>超出限制将返回HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code>。</li>
                <li>收到429响应时，请实现指数退避或重试延迟逻辑。</li>
                <li>反复超出限制或故意绕过限制可能导致密钥撤销或账户暂停。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. 禁止行为
            </h2>
            <p className="leading-relaxed mb-4">禁止通过OpenAPI进行以下行为：</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>发送垃圾邮件、实施网络钓鱼或分发恶意软件等违法行为</li>
                <li>对服务内容进行大规模自动抓取</li>
                <li>探测安全漏洞、入侵服务基础设施或进行未经授权的压力测试</li>
                <li>通过API上传、共享或分发违法内容</li>
                <li>未经授权使用或共享他人的API密钥</li>
                <li>干扰服务正常运营或影响其他用户的使用</li>
                <li>违反适用法律法规的行为</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. 服务限制
            </h2>
            <p className="leading-relaxed mb-4">
                通过OpenAPI上传的文件适用与网页服务相同的文件大小限制、有效期及存储规则，详情请参阅{' '}
                <a href="/terms-of-use" className="underline underline-offset-2 can-hover:hover:text-gray-900 dark:can-hover:hover:text-[#EDEDED] transition-colors">ShareAnything使用条款</a>。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>文件大小及数量限制以一般使用条款为准。</li>
                <li>文件有效期到期后将自动删除。</li>
                <li>ShareAnything可在必要时提前通知后修改服务限制。</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. 违规后果
            </h2>
            <p className="leading-relaxed mb-4">
                滥用OpenAPI或违反本条款可能导致以下后果：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>立即撤销API密钥（无需事先通知）</li>
                <li>暂停或永久终止用户账户（涵盖网页、CLI在内的全部服务）</li>
                <li>永久禁止申请新的API密钥</li>
                <li>情节严重者（涉及违法行为或犯罪），将采取法律行动并向相关部门举报</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. 条款变更
            </h2>
            <p className="leading-relaxed">
                ShareAnything保留随时更新本条款的权利。重要变更将通过电子邮件或应用内通知告知用户。条款生效后继续使用OpenAPI即表示您接受更新后的条款。
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">生效日期</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                本条款自2026年5月21日起生效。
            </p>
        </div>
    </div>
);

export default ApiTermsZhCN;
