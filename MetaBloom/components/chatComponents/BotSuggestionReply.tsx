import { chatOptions } from "@/constants/data";
import { useChatHandler } from "@/stores/chatList";
import { usePathname } from "next/navigation";
import React from "react";
import AnimateHeight from "react-animate-height";

export default function BotSuggestionReply({ show }: { show: boolean }) {
  const { handleSubmit } = useChatHandler();
  const path = usePathname();
  const handleClick = (label: string) => {
    handleSubmit(label, path.split("/chat/")[1]);
  };
  return (
    <AnimateHeight height={show ? "auto" : 0}>
      <div className="mt-5 bg-white p-2 rounded-md relative dark:bg-n0 ">
        <div
          className={`flex flex-wrap justify-center items-center  gap-2 lg:gap-3 `}
        >
          {chatOptions.slice(0, 7).map(({ id, name, color, label }) => (
            <button
              key={id}
              className={`flex justify-center items-center gap-1 lg:gap-2 py-1 sm:py-2 px-2 sm:px-3 lg:px-4   rounded-full border `}
              style={{
                backgroundColor: `rgba(${color},.05)`,
                borderColor: `rgba(${color},.30)`,
              }}
              onClick={() => handleClick(label)}
            >
              <span className="text-[10px] sm:text-xs lg:text-sm font-medium">
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AnimateHeight>
  );
}
