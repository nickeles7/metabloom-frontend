import React, { HTMLInputTypeAttribute } from "react";

type FormInputTypes = {
  title: string;
  placeholder: string;
  type?: HTMLInputTypeAttribute;
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // ✅ Add this line
};

function FormInput({
  title,
  placeholder,
  type = "text",
  value,
  onChange,
  className, // ⬅️ include this
}: FormInputTypes) {
  return (
    <div className="">
      <p className="max-sm:text-sm font-normal">{title}</p>
      <div className="mt-2 sm:mt-4 border border-n30 bg-primaryColor/5 rounded-full py-2 sm:py-3 px-6 dark:border-lightN30 dark:bg-lightBg1">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`bg-transparent outline-none placeholder:text-n400 text-sm dark:placeholder:text-lightN400 w-full ${className ?? ""}`}
        />
      </div>
    </div>
  );
}

export default FormInput;
