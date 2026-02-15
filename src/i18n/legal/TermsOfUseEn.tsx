import React from 'react';

const TermsOfUseEn: React.FC = () => (
    <div className="space-y-8 text-gray-700 dark:text-[#888888]">
        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 1 (Purpose)
            </h2>
            <p className="leading-relaxed">
                These Terms of Use are intended to set forth the rights, obligations, and responsibilities of the Company and the User, as well as other necessary matters, in relation to the use of the file sharing service (hereinafter "the Service") provided by ShareAnything (hereinafter "the Company").
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 2 (Definitions)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>"Service" refers to the file upload, share code generation, and file download service provided by the Company.</li>
                <li>"User" refers to a person who uses the Service provided by the Company in accordance with these Terms.</li>
                <li>"Share Code" refers to a unique identification code generated for downloading uploaded files.</li>
                <li>"Expiration Period" refers to the file retention period set by the User when uploading a file.</li>
                <li>"P2P Secure Transfer" refers to an end-to-end encrypted transfer method that directly transfers files between the sender and receiver based on WebRTC technology.</li>
                <li>"TURN Server" refers to the Cloudflare Realtime TURN server that relays end-to-end encrypted file transfers in network environments where direct P2P connection is not possible.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 3 (Posting and Revision of Terms)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>The Company shall post the contents of these Terms on the initial screen of the Service so that Users can easily access them.</li>
                <li>The Company may revise these Terms to the extent that they do not violate relevant laws.</li>
                <li>When the Company revises these Terms, it shall specify the effective date and the reason for revision and announce them together with the current Terms from 7 days before the effective date until the day before the effective date, in accordance with the method described in Paragraph 1.</li>
                <li>If a User does not agree to the application of the revised Terms, the Company or the User may terminate the service agreement.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 4 (Membership Registration)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>Those who wish to use the Service shall apply for membership registration through Google, Naver, Kakao, or Apple OAuth authentication.</li>
                <li>The Company may refuse to approve or subsequently terminate the service agreement for applications that fall under any of the following:
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>Using another person's information fraudulently</li>
                        <li>The purpose of using the Service is illegal or improper</li>
                        <li>Other cases where the requirements for application set by the Company are not met</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 5 (Provision of Service)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>The Company provides the following services:
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>File upload and storage</li>
                        <li>Share code generation and management</li>
                        <li>File download via share code</li>
                        <li>File password protection feature</li>
                        <li>File expiration period setting feature</li>
                        <li>P2P Secure Transfer: End-to-end encrypted direct file transfer based on WebRTC</li>
                        <li>TURN Relay: End-to-end encrypted file relay transfer via Cloudflare TURN server when direct P2P connection is unavailable</li>
                    </ul>
                </li>
                <li>The Company may temporarily suspend the provision of the Service in cases of maintenance, replacement, or malfunction of information and communication facilities such as computers, network disruption, or other significant operational reasons.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 6 (File Management and Deletion)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>Uploaded files are retained for the expiration period set by the User.</li>
                <li>Files whose expiration period has expired are automatically and immediately deleted, and recovery is not possible.</li>
                <li>The Company may delete files without prior notice that fall under any of the following:
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>Illegal files that violate laws or these Terms</li>
                        <li>Files that infringe on the copyrights or other rights of others</li>
                        <li>Files that are contrary to public order and morality, such as pornography or violent content</li>
                        <li>Files containing malicious code, viruses, etc.</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 7 (Obligations of the User)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>Users shall not engage in any of the following activities:
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>Using another person's information fraudulently</li>
                        <li>Altering information posted by the Company</li>
                        <li>Hacking or attacking the Company's servers and networks</li>
                        <li>Uploading and sharing illegal or improper files</li>
                        <li>Engaging in commercial activities through the Service</li>
                        <li>Other activities that violate relevant laws</li>
                    </ul>
                </li>
                <li>Users must comply with relevant laws, the provisions of these Terms, usage guidelines, and notices related to the Service.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 8 (Ownership of Copyright)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>Copyright and intellectual property rights to the Service belong to the Company.</li>
                <li>Copyright of files uploaded by Users belongs to the respective User, and the Company does not use Users' files for purposes other than providing the Service.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 9 (Limitation of Liability)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>The Company is exempt from liability when it is unable to provide the Service due to force majeure events such as natural disasters, war, or suspension of service by telecommunications carriers.</li>
                <li>The Company is not liable for service disruptions caused by reasons attributable to the User.</li>
                <li>The Company is not liable for the content, accuracy, or legality of files uploaded by Users.</li>
                <li>The Company has no obligation to intervene in disputes arising between Users or between Users and third parties through the Service, and is not liable for any resulting damages.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 10 (Protection of Personal Information)
            </h2>
            <p className="leading-relaxed">
                The Company endeavors to protect Users' personal information in accordance with relevant laws. The Company's Privacy Policy and relevant laws apply to the protection and use of personal information.
            </p>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 11 (Termination of Service Agreement)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>Users may terminate the service agreement at any time by withdrawing their membership.</li>
                <li>The Company may terminate the service agreement with prior notice if the User falls under any of the following:
                    <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                        <li>Violation of these Terms</li>
                        <li>Disruption of the normal operation of the Service</li>
                        <li>Other cases where the Company reasonably determines that providing the Service is difficult</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 12 (Compensation for Damages)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>The Company or the User is liable for damages caused to the other party by violating these Terms.</li>
                <li>However, neither party shall be liable if there is no attributable cause.</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
                Article 13 (Dispute Resolution)
            </h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>The Company and the User shall make every effort necessary to amicably resolve any disputes arising in connection with the Service.</li>
                <li>If a dispute is not resolved despite the efforts described in Paragraph 1, either party may file a lawsuit with the competent court under the Civil Procedure Act.</li>
            </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-[#888888] font-semibold mb-2">Addendum</p>
            <p className="text-sm text-gray-600 dark:text-[#888888]">
                These terms take effect from February 15, 2026.
            </p>
        </div>
    </div>
);

export default TermsOfUseEn;
