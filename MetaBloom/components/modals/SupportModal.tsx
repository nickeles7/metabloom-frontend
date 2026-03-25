"use client";
import FaqItem from "@/components/ui/FaqItem";

import { faqData, supportMenuItems } from "@/constants/data";
import React, { useState, useEffect } from "react";
import { useMainModal } from "@/stores/modal";

function SupportModal() {
  const { modalParams } = useMainModal();
  const [activeMenu, setActiveMenu] = useState(modalParams.initialTab || 0);
  const [show, setShow] = useState(2);
  const [show2, setShow2] = useState(NaN);

  // Update active menu when modal params change
  useEffect(() => {
    if (modalParams.initialTab !== undefined) {
      setActiveMenu(modalParams.initialTab);
    }
  }, [modalParams.initialTab]);
  return (
    <div className="">
      <div className="p-2 border border-primaryColor/30 bg-primaryColor/5 rounded-xl min-[1400px]:rounded-full flex flex-row justify-centert items-center flex-wrap gap-2 w-full mt-6">
        {supportMenuItems.map(({ id, name, icon }, idx) => (
          <div
            key={id}
            className={`flex justify-start items-center gap-2 xl:gap-2 py-2 pl-2 flex-1  border  rounded-full cursor-pointer ${
              activeMenu === idx
                ? " border-primaryColor bg-primaryColor"
                : "border-primaryColor/30 bg-white dark:bg-n0"
            }`}
            onClick={() => setActiveMenu(idx)}
          >
            <div
              className={`flex justify-center items-center border  rounded-full p-1.5 xl:p-2  ${
                activeMenu === idx
                  ? " border-primaryColor bg-white "
                  : "border-primaryColor/30 bg-primaryColor/5"
              }`}
            >
              {React.createElement(icon, {
                className: `text-primaryColor text-base xl:text-xl`,
              })}
            </div>
            <p
              className={`text-sm font-medium text-nowrap pr-4 ${
                activeMenu === idx ? "text-white" : ""
              }`}
            >
              {name}
            </p>
          </div>
        ))}
      </div>

      {activeMenu === 0 && (
        <div className="mt-6 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-5">
          <div className=" pb-5 border-b border-primaryColor/30">
            <p className="text-n700 font-medium dark:text-n30">
              Frequently Asked Questions
            </p>
            <p className="pt-2 text-xs">
              Find answers to common questions about our platform.
            </p>
          </div>
          <div className="pt-5 grid grid-cols-12 gap-4">
            <div className=" col-span-12 md:col-span-6 flex flex-col gap-4">
              {faqData.slice(0, 3).map(({ id, ...props }, idx) => (
                <FaqItem
                  key={id}
                  {...props}
                  idx={idx}
                  show={show}
                  setShow={setShow}
                />
              ))}
            </div>
            <div className="col-span-12 md:col-span-6 flex flex-col gap-4">
              {faqData.slice(3, 5).map(({ id, ...props }, idx) => (
                <FaqItem
                  key={id}
                  {...props}
                  idx={idx + 3}
                  show={show2}
                  setShow={setShow2}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMenu === 1 && (
        <div className="mt-6 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-5">
          <div className="border-b border-primaryColor/20 w-full pb-5">
            <p className="font-medium text-n700 dark:text-n30">Privacy Policy</p>
            <p className="text-xs pt-2">
              Learn about how we handle and protect your data.
            </p>
          </div>
          <div className="flex flex-col gap-5 pt-5">
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Data Collection
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                We collect information that you provide directly to us,
                including when you create an account, use our services, or
                communicate with us.
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Name and contact information</li>
                <li>Account credentials</li>
                <li>Chat history and preferences</li>
                <li>Usage data and analytics</li>
                <li>Payment information when purchasing premium features</li>
                <li>Device information and IP addresses</li>
                <li>Custom bot configurations and settings</li>
              </ul>
            </div>
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Data Usage
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                We use the collected information to:
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Provide and maintain our services</li>
                <li>Improve user experience</li>
                <li>Send important notifications</li>
                <li>Protect against misuse</li>
                <li>Personalize your experience and content</li>
                <li>Process transactions and payments</li>
                <li>Analyze usage patterns to improve our services</li>
                <li>Debug and optimize performance</li>
              </ul>
            </div>
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Data Protection
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                We implement appropriate security measures to protect your
                personal information against unauthorized access, alteration,
                disclosure, or destruction.
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">End-to-end encryption for sensitive data</li>
                <li className="">Regular security audits and assessments</li>
                <li className="">Secure data storage and transmission</li>
                <li className="">Access controls and authentication</li>
                <li className="">Employee training on data protection</li>
              </ul>
            </div>
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Your Rights
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                You have certain rights regarding your personal data:
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Right to access your personal data</li>
                <li className="">Right to correct inaccurate data</li>
                <li className="">Right to request data deletion</li>
                <li className="">Right to restrict processing</li>
                <li className="">Right to data portability</li>
                <li className="">Right to object to processing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {activeMenu === 2 && (
        <div className="mt-6 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-5">
          <div className="border-b border-primaryColor/20 w-full pb-5">
            <p className="font-medium text-n700 dark:text-n30">
              Get Help & Support
            </p>
            <p className="text-xs pt-2">
              Need assistance? Here's how to reach out to our support team.
            </p>
          </div>
          <div className="flex flex-col gap-5 pt-5">
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Contact Support
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                Our support team is here to help you with any questions or issues you may have.
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Email: support@metabloom.ai</li>
                <li>Response time: Within 24 hours</li>
                <li>Available: Monday - Friday, 9 AM - 6 PM EST</li>
                <li>For urgent issues, mark your email as "URGENT"</li>
              </ul>
            </div>
       
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Common Issues
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                Before contacting support, check if your issue is covered in our FAQ section or try these common solutions:
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Clear your browser cache and cookies</li>
                <li>Try using an incognito/private browsing window</li>
                <li>Check your internet connection</li>
                <li>Disable browser extensions temporarily</li>
                <li>Update your browser to the latest version</li>
                <li>Try accessing from a different device</li>
              </ul>
            </div>
            <div className="">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-n700 dark:text-n30">
                  Feature Requests
                </p>
              </div>
              <p className="text-xs text-n300 pt-1">
                Have an idea for a new feature? We'd love to hear from you!
              </p>
              <ul className="text-xs text-n300 list-disc list-inside pt-1 flex flex-col gap-0.5">
                <li className="">Email: features@metabloom.ai</li>
                <li>Include detailed description of the feature</li>
                <li>Explain how it would benefit your workflow</li>
                <li>We review all suggestions and prioritize based on user demand</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SupportModal;
