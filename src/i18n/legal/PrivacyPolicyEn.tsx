import React from 'react';

const PrivacyPolicyEn: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                1. Purpose of Processing Personal Information
            </h2>
            <p className="leading-relaxed mb-4">
                ShareAnything (hereinafter "the Company") processes personal information for the following purposes. Personal information collected will not be used for any purpose other than those stated below. If the purpose of use changes, the Company will take necessary measures, such as obtaining separate consent, in accordance with Article 18 of the Personal Information Protection Act.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Membership registration and management: Providing membership services, identity verification, maintaining and managing membership status, preventing unauthorized use of the service</li>
                <li>Service provision: Providing file upload and download services, generating and managing share codes</li>
                <li>Service improvement: Analyzing service usage statistics and improving services</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                2. Categories of Personal Information Processed
            </h2>
            <div className="leading-relaxed">
                <p className="mb-4">The Company collects only the minimum personal information through OAuth authentication.</p>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Required Items</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>When logging in via Google OAuth: Email address, name, profile picture</li>
                    <li>When logging in via Naver OAuth: Email address, name</li>
                    <li>When logging in via Kakao OAuth: Email address, nickname, profile picture</li>
                    <li>When logging in via Apple OAuth: Email address, name</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Automatically Collected Items</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>Service usage records, IP address</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">File-Related Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                    <li>Uploaded file name, file size, upload date and time</li>
                    <li>Share code, file expiration period</li>
                    <li>File password (stored encrypted)</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">P2P Secure Transfer</h3>
                <p className="ml-4">When using P2P secure transfer, files are not stored on the server and are transferred directly between the sender and receiver. The Company does not access the contents of P2P-transferred files and only records transfer metadata (transfer time, file size, etc.).</p>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                3. Processing and Retention Period of Personal Information
            </h2>
            <p className="leading-relaxed mb-4">
                The Company processes and retains personal information within the retention and usage period prescribed by law or within the retention and usage period agreed upon when collecting personal information from the data subject.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Member information: Retained until membership withdrawal. However, if an investigation or inquiry due to violation of relevant laws is in progress, retained until the conclusion of such investigation or inquiry</li>
                <li>Uploaded files: Retained until the expiration period set by the user, and immediately destroyed upon expiration</li>
                <li>Service usage records: Destroyed after 3 months of retention</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Retention Under Relevant Laws</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Records of contracts or subscription withdrawal: 5 years (Act on Consumer Protection in Electronic Commerce)</li>
                <li>Records of consumer complaints or dispute resolution: 3 years (Act on Consumer Protection in Electronic Commerce)</li>
                <li>Records of access logs: 3 months (Protection of Communications Secrets Act)</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                4. Provision of Personal Information to Third Parties
            </h2>
            <p className="leading-relaxed mb-4">
                The Company processes personal information only within the scope specified in Article 1 (Purpose of Processing Personal Information) and provides personal information to third parties only in cases falling under Article 17 of the Personal Information Protection Act, such as the consent of the data subject or special provisions of law.
            </p>
            <p className="leading-relaxed">
                Currently, the Company does not provide personal information to third parties.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                5. Entrustment of Personal Information Processing
            </h2>
            <p className="leading-relaxed mb-4">
                The Company entrusts personal information processing as follows for smooth handling of personal information operations.
            </p>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-white/15 border-collapse">
                    <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">Entrusted Party</th>
                        <th className="border border-gray-300 dark:border-white/15 px-4 py-2 text-left dark:text-[#EDEDED]">Details of Entrusted Work</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Google LLC</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth authentication service</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Naver Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth authentication service</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Kakao Corp.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth authentication service</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Apple Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">OAuth authentication service</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Amazon Web Services, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Server hosting</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">Cloudflare, Inc.</td>
                        <td className="border border-gray-300 dark:border-white/15 px-4 py-2 dark:text-[#EDEDED]">File storage, TURN relay service (P2P secure transfer)</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <p className="leading-relaxed mt-4">
                When entering into entrustment contracts, the Company specifies in writing, in accordance with Article 26 of the Personal Information Protection Act, matters concerning the prohibition of processing personal information beyond the purpose of entrusted work, technical and administrative safeguards, restrictions on re-entrustment, management and supervision of the entrusted party, and liability including compensation for damages, and supervises whether the entrusted party processes personal information securely.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                6. Rights and Obligations of Data Subjects and Methods of Exercise
            </h2>
            <p className="leading-relaxed mb-4">
                Data subjects may exercise the following rights related to personal information protection against the Company at any time.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Request to access personal information</li>
                <li>Request for correction in case of errors</li>
                <li>Request for deletion</li>
                <li>Request for suspension of processing</li>
            </ul>
            <p className="leading-relaxed">
                Rights may be exercised through written request, telephone, or email to the Company, and the Company will take action without delay.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                7. Destruction of Personal Information
            </h2>
            <p className="leading-relaxed mb-4">
                The Company destroys personal information without delay when it becomes unnecessary, such as when the retention period has expired or the purpose of processing has been achieved.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Destruction Procedure</h3>
            <p className="leading-relaxed mb-4">
                Unnecessary personal information is destroyed after approval by the Personal Information Protection Officer.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Destruction Method</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Electronic files: Permanently deleted using methods that make recovery and reproduction impossible</li>
                <li>Records and printed materials: Shredded or incinerated</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">Automatic File Destruction</h3>
            <p className="leading-relaxed">
                Files uploaded by users are automatically and immediately destroyed when the designated expiration period expires, and recovery is not possible.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                8. Measures to Ensure the Security of Personal Information
            </h2>
            <p className="leading-relaxed mb-4">
                The Company takes the following measures to ensure the security of personal information.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Administrative measures: Establishment and implementation of internal management plans, employee training</li>
                <li>Technical measures: Encrypted storage of passwords, installation and periodic updates of security programs against hacking, retention and prevention of falsification of access logs, end-to-end encryption (E2E) applied for P2P secure transfers</li>
                <li>Physical measures: Access control to server rooms, data storage facilities, etc.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                9. Personal Information Protection Officer
            </h2>
            <p className="leading-relaxed mb-4">
                The Company has designated a Personal Information Protection Officer as follows to be responsible for overseeing personal information processing and handling complaints and remedies related to personal information processing by data subjects.
            </p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                <p className="font-semibold mb-2 dark:text-[#EDEDED]">Personal Information Protection Officer</p>
                <ul className="space-y-1 text-sm">
                    <li>Name: Mingyu Park</li>
                    <li>Position: ShareAnything Developer</li>
                    <li>Contact: support@shareany.app</li>
                </ul>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                10. Changes to the Privacy Policy
            </h2>
            <p className="leading-relaxed">
                This Privacy Policy may be amended due to changes in laws, policies, or security technologies. Any additions, deletions, or modifications will be announced through notices at least 7 days prior to the effective date.
            </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                Announcement date: February 15, 2026
            </p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                Effective date: February 15, 2026
            </p>
        </div>
    </div>
);

export default PrivacyPolicyEn;
