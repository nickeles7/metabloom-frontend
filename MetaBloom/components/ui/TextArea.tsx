import React from "react";

type InputFieldProps = {
  className: string;
  title: string;
  placeholder: string;
};

function TextArea({ className, title, placeholder }: InputFieldProps) {
  return (
    <div className={className}>
      <p className="text-xs text-n400 -mb-2.5 pl-6">
        <span className="bg-white px-1 dark:bg-n0">{title}</span>
      </p>
      <div className="border border-primaryColor/20 rounded-xl py-3 px-5 ">
        <textarea
          placeholder={placeholder}
          className="bg-transparent outline-none text-xs placeholder:text-n100 w-full h-[60px]"
        ></textarea>
      </div>
    </div>
  );
}

export default TextArea;
