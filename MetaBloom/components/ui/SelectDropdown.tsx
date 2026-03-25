import React from "react";
import Select from "react-select";

type OptionsProps = {
  value: string;
  label: string;
};

type SelectDropdownProps = {
  options: OptionsProps[];
  title: string;
  placeholder: string;
};

function SelectDropdown({ options, title, placeholder }: SelectDropdownProps) {
  return (
    <div>
      <p className="text-xs text-n400 -mb-2.5 pl-6">
        <span className="bg-white dark:bg-n0 px-1 relative z-10">{title}</span>
      </p>
      <Select
        options={options}
        placeholder={placeholder}
        classNames={{
          control: ({ isFocused }) =>
            `border !border-primaryColor/30 !rounded-xl !bg-transparent py-1 px-5 ${
              isFocused
                ? "border-primaryColor/50 shadow-md"
                : "border-primaryColor/30"
            }`,
          menu: () => "bg-white dark:bg-n0 shadow-lg rounded-lg ",
          option: ({ isFocused, isSelected }) =>
            ` ${
              isSelected
                ? "!bg-primaryColor/20 !text-n700 dark:!text-white"
                : " "
            } ${
              isFocused ? "!bg-primaryColor/20 !text-n700 dark:!text-white" : ""
            } !text-sm`,
          singleValue: () => "!text-n100 dark:!text-white text-xs",
          menuList: () => "p-2 ",
          placeholder: () => "!text-xs",
        }}
        // menuPosition="fixed"
        // menuPlacement="bottom"
      />
    </div>
  );
}

export default SelectDropdown;
