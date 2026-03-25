import React, { useState } from "react";
import { PiCopy, PiPencilSimpleLine, PiCheck } from "react-icons/pi";

type MyReplyProps = {
  replyTime: string;
  replyText: string;
};

function MyReply({ replyTime, replyText }: MyReplyProps) {
  const [copied, setCopied] = useState(false);

  // Function to copy text to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="user-message-wrapper">
      <p className="text-xs text-n100">{replyTime}</p>
      <div className="user-message-content">
        <div className="text-sm user-response-container p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl overflow-hidden shadow-sm">
          <p className="text-n700 dark:text-n30 whitespace-pre-wrap break-words leading-relaxed">{replyText}</p>
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 mt-2">
        <button
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer text-gray-500 dark:text-gray-400"
          onClick={copyToClipboard}
        >
          {copied ? <PiCheck /> : <PiCopy />}
        </button>
      </div>
    </div>
  );
}

export default MyReply;
