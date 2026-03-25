"use client";
import React from "react";
import AnimateHeight from "react-animate-height";
import { PiMinus, PiPlus } from "react-icons/pi";

type FaqItemProps = {
  question: string;
  answer: string;
  idx: number;
  show: number;
  setShow: React.Dispatch<React.SetStateAction<number>>;
};

function FaqItem({ question, answer, idx, show, setShow }: FaqItemProps) {
  return (
    <div
      onClick={() => setShow(idx === show ? NaN : idx)}
      className={`cursor-pointer rounded-xl border ${
        show === idx
          ? "bg-primaryColor border-primaryColor"
          : "border-primaryColor/30 bg-white dark:bg-n0"
      } px-6 py-3 duration-300 `}
    >
      <div className="flex items-center justify-between">
        <h6
          className={`font-medium ${
            show === idx ? "text-white " : "text-n700 dark:text-n30"
          } duration-300`}
        >
          {question}
        </h6>
        <div
          className={`text-white  p-1 rounded-md ${
            show === idx ? "bg-errorColor" : "bg-primaryColor"
          }`}
        >
          {show === idx ? <PiMinus /> : <PiPlus />}
        </div>
      </div>
      <AnimateHeight height={show === idx ? "auto" : 0}>
        <p
          className={`text-xs ${
            show === idx ? "text-white" : ""
          } duration-300 pt-3 border-t border-dashed border-white mt-3`}
        >
          {answer}
        </p>
      </AnimateHeight>
    </div>
  );
}

export default FaqItem;
