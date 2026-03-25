import React, { HTMLInputTypeAttribute, useState } from "react";
import { PiEye, PiEyeClosed } from "react-icons/pi";

type InputFieldProps = {
  className: string;
  title: string;
  type?: HTMLInputTypeAttribute;
  placeholder: string;
};

function InputFieldSecond({
  className,
  title,
  type = "text",
  placeholder,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className={className}>
      <p className="text-xs text-n400 -mb-2.5 pl-6">
        <span className="bg-white dark:bg-n0 px-1">{title}</span>
      </p>
      <div className="border border-primaryColor/20 rounded-xl py-3 px-5 flex justify-between items-center gap-2 ">
        <input
          type={showPassword ? "text" : type}
          placeholder={placeholder}
          className="bg-transparent outline-none text-xs placeholder:text-n100 w-full"
        />
        {type === "password" && (
          <button className="" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? <PiEye /> : <PiEyeClosed />}
          </button>
        )}
      </div>
    </div>
  );
}

export default InputFieldSecond;
