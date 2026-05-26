import React from 'react';

const ApiTermsEn: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. Introduction
            </h2>
            <p className="leading-relaxed">
                These OpenAPI Terms of Use ("API Terms") govern your use of the ShareAnything public API ("OpenAPI"), including API keys, rate limits, and permitted usage. These API Terms are supplemental to the general ShareAnything Terms of Use and apply in addition to them. By using the OpenAPI, you agree to these API Terms.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. Authentication &amp; API Keys
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>All OpenAPI requests must include a valid API key in the <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">X-API-Key</code> request header.</li>
                <li>API keys are personal credentials. Do not share your key with third parties or expose it in public repositories, client-side code, or other public environments.</li>
                <li>We recommend issuing a separate API key for each external service or use case to limit the impact of a potential compromise.</li>
                <li>If you suspect your API key has been compromised, revoke it immediately from Settings and issue a new one.</li>
                <li>ShareAnything may revoke an API key without prior notice if a violation of these terms is detected or if you request revocation.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. Rate Limits
            </h2>
            <p className="leading-relaxed mb-4">
                Rate limits are enforced per API key to ensure service stability. The limits by endpoint type are as follows:
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">Endpoint Type</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">Endpoints</th>
                            <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">Limit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Read</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/me, GET /v1/shares/…, GET /v1/me/uploads, GET /v1/me/downloads, etc.</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">500 / hour</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Upload</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">POST /v1/uploads, POST /v1/uploads/multipart series</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">100 / hour</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/shares/…/download</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">300 / hour</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">P2P signaling</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#888888] font-mono text-xs">GET /v1/ws/signaling</td>
                            <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">10 concurrent · 30 connect attempts / minute</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ul className="list-decimal list-inside space-y-2 ml-4 mt-4">
                <li>Exceeding a rate limit returns HTTP <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code>.</li>
                <li>You should implement backoff or retry logic when receiving 429 responses.</li>
                <li>P2P signaling is a long-lived WebSocket and therefore capped by concurrent active connections and connect attempts per minute instead of hourly request count. Exceeding either cap rejects the upgrade with a 429.</li>
                <li>P2P transfer endpoints (<code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">POST /v1/p2p/sessions</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/p2p/sessions/&#123;code&#125;/status</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/turn/credentials</code>, <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono">GET /v1/ws/signaling</code>) require a dedicated <strong>p2p_transfer</strong> scope. This scope must be explicitly selected at API key issuance.</li>
                <li>File payloads transferred over the WebRTC DataChannel do not pass through our servers and therefore are not rate-limited. However, Cloudflare TURN relay traffic is billed to our account; intentionally generating excessive traffic or attempting to abuse TURN relay is prohibited.</li>
                <li>Repeated limit violations or intentional attempts to circumvent rate limits may result in key revocation or account suspension.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. Prohibited Use
            </h2>
            <p className="leading-relaxed mb-4">You must not use the OpenAPI to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Send spam, facilitate phishing, or distribute malware or other harmful content.</li>
                <li>Perform high-volume automated scraping of service content.</li>
                <li>Probe, scan, or test the security of service infrastructure, or conduct load testing without authorization.</li>
                <li>Upload, share, or distribute illegal content through the API.</li>
                <li>Use or share another user's API key without authorization.</li>
                <li>Interfere with normal service operations or degrade the experience for other users.</li>
                <li>Engage in any activity prohibited by applicable law or regulation.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. Service Limits
            </h2>
            <p className="leading-relaxed mb-4">
                File size limits, expiration policies, and storage rules that apply to the web service also apply to files uploaded via the OpenAPI. Please refer to the{' '}
                <a href="/terms-of-use" className="underline underline-offset-2 can-hover:hover:text-gray-900 dark:can-hover:hover:text-[#EDEDED] transition-colors">ShareAnything Terms of Use</a> for details.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Upload file size and count limits are governed by the general Terms of Use.</li>
                <li>Files uploaded via the API are automatically deleted when their expiration period ends.</li>
                <li>ShareAnything may update service limits with prior notice when operationally required.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. Consequences of Abuse
            </h2>
            <p className="leading-relaxed mb-4">
                Malicious or abusive use of the OpenAPI, or violation of these API Terms, may result in:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Immediate revocation of the API key without prior notice.</li>
                <li>Temporary suspension or permanent termination of your user account across all ShareAnything services (web, CLI, and API).</li>
                <li>Permanent prohibition from issuing future API keys.</li>
                <li>In cases involving illegal conduct or criminal abuse, legal action and reporting to the relevant authorities.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. Modifications
            </h2>
            <p className="leading-relaxed">
                ShareAnything reserves the right to update these API Terms at any time. Users will be notified of material changes via email and/or in-app notice. Continued use of the OpenAPI after the effective date of any change constitutes acceptance of the updated terms.
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">Effective Date</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                These API Terms are effective as of May 21, 2026.
            </p>
        </div>
    </div>
);

export default ApiTermsEn;
